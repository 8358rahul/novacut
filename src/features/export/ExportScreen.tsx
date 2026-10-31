import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import { Project } from '../../core/models/project';
import {
  ExportResolutionPreset,
  ExportFpsPreset,
  ExportQualityPreset,
} from '../../core/models/export';
import { defaultProjectStorage } from '../../core/persistence/storage';
import { formatTimecode } from '../../core/models/timeline';
import { buildExportCompositionPlan } from '../../core/rendering/exporter';
import { defaultAIEngineService } from '../../services/aiEngineService';
import { prepareExportClips } from '../../services/exportService';
import { useGuaranteedInsets } from '../../navigation/safeArea';

export interface ExportScreenProps {
  projectId: string;
  onBack: () => void;
  onExportComplete?: (outputPath: string) => void;
}

const RESOLUTIONS: { preset: ExportResolutionPreset; label: string; desc: string }[] = [
  { preset: '720p', label: '720p HD', desc: 'Fast export, small file' },
  { preset: '1080p', label: '1080p Full HD', desc: 'Standard for social media' },
  { preset: '4K', label: '4K Ultra HD', desc: 'Highest clarity & bitrate' },
];

const FPS_PRESETS: ExportFpsPreset[] = [24, 30, 60];
const QUALITY_PRESETS: { preset: ExportQualityPreset; label: string }[] = [
  { preset: 'standard', label: 'Standard (8 Mbps)' },
  { preset: 'high', label: 'High (16 Mbps)' },
  { preset: 'ultra', label: 'Ultra (30 Mbps)' },
];

export const ExportScreen: React.FC<ExportScreenProps> = ({
  projectId,
  onBack,
  onExportComplete,
}) => {
  const insets = useGuaranteedInsets();
  const exportAttempt = useRef(0);
  useEffect(() => () => { exportAttempt.current += 1; }, []);
  const [project, setProject] = useState<Project | null>(null);
  const [resolution, setResolution] = useState<ExportResolutionPreset>('1080p');
  const [fps, setFps] = useState<ExportFpsPreset>(30);
  const [quality, setQuality] = useState<ExportQualityPreset>('high');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputPath, setOutputPath] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const p = await defaultProjectStorage.loadProject(projectId);
      if (p) setProject(p);
    }
    load();
  }, [projectId]);

  if (!project) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading Project...</Text>
      </View>
    );
  }

  const handleStartExport = async () => {
    if (!project) return;
    setIsExporting(true);
    setProgress(0.05);
    setOutputPath(null);

    const attempt = ++exportAttempt.current;
    const active = () => exportAttempt.current === attempt;
    const host = defaultAIEngineService.getBaseUrl();
    try {
      const clips = await prepareExportClips(project);
      if (!active()) return;
      const res = await fetch(`${host}/export`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.metadata.id, title: project.metadata.title,
          aspectRatio: project.settings.aspectRatio, resolution, fps, quality, clips }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) throw new Error(`Export rejected (${res.status}): ${await res.text()}`);
      const { jobId } = await res.json();
      if (!jobId) throw new Error('Server did not return an export job.');
      const deadline = Date.now() + 30 * 60_000;
      while (active() && Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 1000));
        if (!active()) return;
        const check = await fetch(`${host}/export/${encodeURIComponent(jobId)}`, { signal: AbortSignal.timeout(30_000) });
        if (!check.ok) throw new Error(`Cannot read export status (${check.status}).`);
        const job = await check.json();
        if (!active()) return;
        setProgress(job.progress ?? 0);
        if (job.status === 'failed') throw new Error(job.error || 'Rendering failed.');
        if (job.status === 'completed') {
          if (!job.filename) throw new Error('Server did not return a downloadable video.');
          const downloadUrl = `${host}/download/${encodeURIComponent(job.filename)}`;
          const saved = Platform.OS === 'web' ? downloadUrl :
            (await File.downloadFileAsync(downloadUrl, new File(Paths.document, job.filename), { idempotent: true })).uri;
          if (!active()) return;
          setOutputPath(saved);
          onExportComplete?.(saved);
          return;
        }
      }
      if (active()) throw new Error('Export timed out. Check the server before retrying.');
    } catch (error) {
      if (active()) Alert.alert('Export failed', error instanceof Error ? error.message : String(error));
    } finally {
      if (active()) setIsExporting(false);
    }
  };

  const handleCancelExport = () => {
    exportAttempt.current += 1;
    setIsExporting(false);
    setProgress(0);
    Alert.alert('Stopped waiting', 'The server may continue rendering this job.');
  };

  const handleShareVideo = async () => {
    if (!outputPath) return;
    try {
      if (typeof window !== 'undefined' && outputPath.startsWith('http')) {
        window.open(outputPath, '_blank');
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(outputPath, {
          mimeType: 'video/mp4',
          dialogTitle: `Share ${project?.metadata.title || 'Video'}`,
        });
      } else {
        Alert.alert('Video Saved', `Video rendered successfully at:\n${outputPath}`);
      }
    } catch (e: any) {
      Alert.alert('Share Error', e.message || 'Could not share video');
    }
  };

  const plan = project
    ? buildExportCompositionPlan(project, {}, {}, {
        resolutionPreset: resolution,
        width: resolution === '4K' ? 3840 : resolution === '720p' ? 1280 : 1920,
        height: resolution === '4K' ? 2160 : resolution === '720p' ? 720 : 1080,
        fps,
        quality,
        videoBitrateMbps: quality === 'ultra' ? 30 : quality === 'high' ? 16 : 8,
        audioBitrateKbps: 192,
        format: 'mp4',
      })
    : null;

  return (
    <View style={styles.container}>
      <Header title="Export Video" subtitle={project.metadata.title} onBack={onBack} />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* Project Summary Card */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{project.metadata.title}</Text>
          <View style={styles.summaryMetaRow}>
            <Text style={styles.summaryText}>
              Duration: {formatTimecode(project.metadata.durationUs)}
            </Text>
            <Badge label={project.settings.aspectRatio} variant="accent" />
          </View>
          {plan && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ fontSize: 11, color: colors.accentGold, fontWeight: '600' }}>
                Est. Size: ~{plan.estimatedFileSizeMb} MB
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                Output: {plan.outputResolution.width}x{plan.outputResolution.height} @ {fps}fps
              </Text>
            </View>
          )}
        </Card>

        {/* Resolution Options */}
        <Text style={styles.sectionTitle}>Resolution</Text>
        <View style={styles.optionsList}>
          {RESOLUTIONS.map((res) => (
            <TouchableOpacity
              key={res.preset}
              activeOpacity={0.7}
              onPress={() => setResolution(res.preset)}
              style={[
                styles.optionRow,
                resolution === res.preset && styles.optionRowSelected,
              ]}
            >
              <View>
                <Text
                  style={[
                    styles.optionLabel,
                    resolution === res.preset && styles.optionLabelSelected,
                  ]}
                >
                  {res.label}
                </Text>
                <Text style={styles.optionDesc}>{res.desc}</Text>
              </View>
              {resolution === res.preset && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Frame Rate Options */}
        <Text style={styles.sectionTitle}>Frame Rate</Text>
        <View style={styles.fpsRow}>
          {FPS_PRESETS.map((f) => (
            <TouchableOpacity
              key={f}
              activeOpacity={0.7}
              onPress={() => setFps(f)}
              style={[styles.fpsCard, fps === f && styles.fpsCardSelected]}
            >
              <Text
                style={[styles.fpsLabel, fps === f && styles.fpsLabelSelected]}
              >
                {f} FPS
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quality Bitrate Preset */}
        <Text style={styles.sectionTitle}>Quality & Bitrate</Text>
        <View style={styles.optionsList}>
          {QUALITY_PRESETS.map((q) => (
            <TouchableOpacity
              key={q.preset}
              activeOpacity={0.7}
              onPress={() => setQuality(q.preset)}
              style={[
                styles.optionRow,
                quality === q.preset && styles.optionRowSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  quality === q.preset && styles.optionLabelSelected,
                ]}
              >
                {q.label}
              </Text>
              {quality === q.preset && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Export Progress Indicator */}
        {isExporting && (
          <Card style={styles.progressCard}>
            <Text style={styles.progressTitle}>Rendering MP4 Video...</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${Math.round(progress * 100)}%` },
                ]}
              />
            </View>
            <View style={styles.progressPercentRow}>
              <Text style={styles.progressPercentText}>
                {Math.round(progress * 100)}%
              </Text>
              <TouchableOpacity onPress={handleCancelExport}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        {/* Export Success Banner */}
        {outputPath && (
          <Card style={styles.successCard}>
            <Text style={styles.successTitle}>✅ Export Finished!</Text>
            <Text style={styles.successPath} numberOfLines={2}>
              {outputPath}
            </Text>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareVideo}
              activeOpacity={0.8}
            >
              <Text style={styles.shareButtonText}>📤 Save to Photos / Share Video</Text>
            </TouchableOpacity>
          </Card>
        )}
      </ScrollView>

      {/* Bottom Export Action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          title={isExporting ? 'Exporting...' : 'Start MP4 Export'}
          variant="primary"
          size="lg"
          disabled={isExporting}
          onPress={handleStartExport}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.textPrimary,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  summaryCard: {
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  summaryText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  optionsList: {
    gap: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  optionRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  optionLabelSelected: {
    color: colors.textPrimary,
  },
  optionDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  checkIcon: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  fpsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fpsCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  fpsCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  fpsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  fpsLabelSelected: {
    color: colors.textPrimary,
  },
  progressCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceLight,
  },
  progressTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.timelineBg,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressPercentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  progressPercentText: {
    color: colors.accentGold,
    fontSize: 12,
    fontWeight: '700',
  },
  cancelText: {
    color: colors.accentCoral,
    fontSize: 12,
    fontWeight: '600',
  },
  successCard: {
    marginTop: spacing.lg,
    borderColor: colors.success,
    backgroundColor: '#0F261E',
  },
  successTitle: {
    color: colors.success,
    fontSize: 16,
    fontWeight: '700',
  },
  successPath: {
    color: colors.textPrimary,
    fontSize: 11,
    marginTop: 4,
  },
  shareButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
