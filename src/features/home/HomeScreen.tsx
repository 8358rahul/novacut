import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import {
  ProjectMetadata,
  AspectRatio,
} from '../../core/models/project';
import { defaultProjectStorage } from '../../core/persistence/storage';
import { formatTimecode } from '../../core/models/timeline';
import { VIRAL_TEMPLATES } from '../../core/templates/templateEngine';
import { useGuaranteedInsets } from '../../navigation/safeArea';
import {
  pickPhotoFromGallery,
  capturePhotoWithCamera,
  pickVideoFromStorage,
} from '../../services/mediaImport';

export interface HomeScreenProps {
  onOpenProject: (projectId: string) => void;
  onOpenPhotoEditor: (imageUri?: string) => void;
  onOpenTemplates: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  hideBottomBar?: boolean;
}

const ASPECT_RATIOS: { ratio: AspectRatio; label: string; desc: string }[] = [
  { ratio: '9:16', label: '9:16', desc: 'TikTok, Reels, Shorts' },
  { ratio: '16:9', label: '16:9', desc: 'YouTube, Landscape' },
  { ratio: '1:1', label: '1:1', desc: 'Instagram Square' },
  { ratio: '4:5', label: '4:5', desc: 'Feed Portrait' },
];

interface QuickToolItem {
  id: string;
  name: string;
  icon: string;
  action: 'video' | 'photo' | 'template' | 'captions' | 'autocut' | 'removebg';
  badge?: string;
}

const QUICK_TOOLS: QuickToolItem[] = [
  { id: 'autocut', name: 'AutoCut', icon: '⚡', action: 'autocut', badge: 'AI' },
  { id: 'camera', name: 'Camera', icon: '🎥', action: 'video' },
  { id: 'captions', name: 'Captions', icon: '💬', action: 'captions', badge: 'HOT' },
  { id: 'retouch', name: 'Retouch', icon: '✨', action: 'photo', badge: 'PRO' },
  { id: 'removebg', name: 'Remove BG', icon: '✂️', action: 'removebg' },
  { id: 'product', name: 'Product', icon: '📦', action: 'photo' },
  { id: 'prompter', name: 'Prompter', icon: '📜', action: 'video' },
  { id: 'photo', name: 'Photos', icon: '📸', action: 'photo' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenProject,
  onOpenPhotoEditor,
  onOpenTemplates,
  onOpenSearch,
  onOpenSettings,
  hideBottomBar = false,
}) => {
  const insets = useGuaranteedInsets();
  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<AspectRatio>('9:16');
  const [newProjectTitle, setNewProjectTitle] = useState('');

  const loadProjects = async () => {
    setLoading(true);
    const list = await defaultProjectStorage.listProjects();
    setProjects(list);
    setLoading(false);
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = async () => {
    const title = newProjectTitle.trim() || 'Untitled Project';
    const project = defaultProjectStorage.createProject(title, selectedRatio);
    await defaultProjectStorage.saveProject(project);
    setCreateModalVisible(false);
    setNewProjectTitle('');
    await loadProjects();
    onOpenProject(project.metadata.id);
  };

  const handleCreateWithGalleryMedia = async () => {
    const title = newProjectTitle.trim() || 'Untitled Project';
    const project = defaultProjectStorage.createProject(title, selectedRatio);
    await defaultProjectStorage.saveProject(project);
    setCreateModalVisible(false);
    setNewProjectTitle('');
    await loadProjects();
    onOpenProject(project.metadata.id);
  };

  const handlePickPhotoFromGallery = async () => {
    setPhotoModalVisible(false);
    try {
      const picked = await pickPhotoFromGallery();
      if (picked) {
        onOpenPhotoEditor(picked.uri);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e.message || 'Could not pick photo from gallery');
    }
  };

  const handleCapturePhoto = async () => {
    setPhotoModalVisible(false);
    try {
      const captured = await capturePhotoWithCamera();
      if (captured) {
        onOpenPhotoEditor(captured.uri);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e.message || 'Could not take photo');
    }
  };

  const handleDeleteProject = (id: string, title: string) => {
    Alert.alert('Delete Project', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await defaultProjectStorage.deleteProject(id);
          loadProjects();
        },
      },
    ]);
  };

  const handleDuplicateProject = async (id: string) => {
    await defaultProjectStorage.duplicateProject(id);
    loadProjects();
  };

  const handleQuickToolPress = (tool: QuickToolItem) => {
    if (tool.action === 'photo' || tool.action === 'removebg') {
      setPhotoModalVisible(true);
    } else if (tool.action === 'template') {
      onOpenTemplates();
    } else {
      setCreateModalVisible(true);
    }
  };

  const renderProjectItem = ({ item }: { item: ProjectMetadata }) => {
    const lastEdited = new Date(item.updatedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card style={styles.projectCard}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onOpenProject(item.id)}
          style={styles.projectCardContent}
        >
          {/* Thumbnail Box */}
          <View style={styles.thumbnailBox}>
            <Text style={styles.thumbnailIcon}>🎬</Text>
            <View style={styles.durationPill}>
              <Text style={styles.durationText}>{formatTimecode(item.durationUs)}</Text>
            </View>
          </View>

          <View style={styles.projectInfo}>
            <Text style={styles.projectTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.projectDate}>Edited {lastEdited}</Text>
            <View style={styles.tagRow}>
              <Badge label="1080P" variant="primary" />
              <Badge label="30 FPS" variant="muted" />
            </View>
          </View>
        </TouchableOpacity>

        {/* Project Card Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDuplicateProject(item.id)}
          >
            <Text style={styles.actionIcon}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteProject(item.id, item.title)}
          >
            <Text style={styles.actionIcon}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Brand & Search Bar Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>NOVACUT</Text>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onOpenSettings} style={styles.settingsBtn}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* CapCut-style Universal Search Trigger Header Bar */}
      <TouchableOpacity
        style={styles.searchHeaderBar}
        activeOpacity={0.85}
        onPress={onOpenSearch}
      >
        <Text style={styles.searchHeaderIcon}>🔍</Text>
        <Text style={styles.searchHeaderPlaceholder}>
          Search templates, effects, music, or tags...
        </Text>
        <View style={styles.searchBadge}>
          <Text style={styles.searchBadgeText}>FIND</Text>
        </View>
      </TouchableOpacity>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.mainScrollView}
        contentContainerStyle={{ paddingBottom: 84 + insets.bottom }}
      >
        {/* CapCut 8-Utility Feature Dock */}
        <View style={styles.quickToolsGrid}>
          {QUICK_TOOLS.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={styles.quickToolItem}
              activeOpacity={0.75}
              onPress={() => handleQuickToolPress(tool)}
            >
              <View style={styles.quickToolIconCircle}>
                <Text style={styles.quickToolIcon}>{tool.icon}</Text>
                {tool.badge && (
                  <View style={styles.quickToolBadge}>
                    <Text style={styles.quickToolBadgeText}>{tool.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.quickToolName} numberOfLines={1}>
                {tool.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CapCut Giant Hero Button: + New Project */}
        <TouchableOpacity
          style={styles.heroNewProjectCard}
          activeOpacity={0.85}
          onPress={() => setCreateModalVisible(true)}
        >
          <View style={styles.heroCircleIcon}>
            <Text style={styles.heroCirclePlus}>+</Text>
          </View>
          <View style={styles.heroTextCol}>
            <Text style={styles.heroActionTitle}>New Project</Text>
            <Text style={styles.heroActionSubtitle}>Multi-track video editor with keyframes & effects</Text>
          </View>
          <View style={styles.heroScissorsBadge}>
            <Text style={styles.heroScissorsIcon}>✂️</Text>
          </View>
        </TouchableOpacity>

        {/* Trending Viral CutSame Templates Carousel */}
        <View style={styles.templatesReelSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Trending Templates 🔥</Text>
              <Text style={styles.sectionSubtitle}>Viral TikTok & Reel beat-synced CutSame edits</Text>
            </View>
            <TouchableOpacity onPress={onOpenTemplates} style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All 〉</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.templatesCarousel}
          >
            {VIRAL_TEMPLATES.slice(0, 4).map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                style={[styles.templateReelCard, { backgroundColor: tpl.previewGradient[0] }]}
                activeOpacity={0.8}
                onPress={onOpenTemplates}
              >
                <View style={styles.templateCardOverlay}>
                  <Text style={styles.templateReelEmoji}>{tpl.previewThumbnail}</Text>
                  <View style={styles.templateReelPill}>
                    <Text style={styles.templateReelPillText}>{tpl.slots.length} Clips</Text>
                  </View>
                  <Text style={styles.templateReelTitle} numberOfLines={1}>
                    {tpl.title}
                  </Text>
                  <Text style={styles.templateReelSound} numberOfLines={1}>
                    🎵 {tpl.soundTitle}
                  </Text>
                  <View style={styles.useTemplatePill}>
                    <Text style={styles.useTemplatePillText}>Use Template</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Recent Projects Section */}
        <View style={styles.projectsSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Projects</Text>
              <Text style={styles.sectionSubtitle}>
                {projects.length} {projects.length === 1 ? 'project' : 'projects'} saved
              </Text>
            </View>
          </View>

          {projects.length === 0 && !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🎞️</Text>
              <Text style={styles.emptyTitle}>No Projects Yet</Text>
              <Text style={styles.emptySubtitle}>
                Tap "New Project" above to create your first edit, or choose a viral template.
              </Text>
            </View>
          )}

          {projects.map((p) => (
            <View key={p.id}>{renderProjectItem({ item: p })}</View>
          ))}
        </View>
      </ScrollView>

      {/* CapCut-Style Bottom Navigation Bar (rendered when standalone) */}
      {!hideBottomBar && (
        <View
          style={[
            styles.bottomTabBar,
            {
              paddingBottom: insets.bottom,
              height: 58 + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity style={styles.bottomTabActive}>
            <Text style={styles.bottomTabIcon}>✂️</Text>
            <Text style={styles.bottomTabLabelActive}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTab} onPress={onOpenTemplates}>
            <Text style={styles.bottomTabIcon}>🪄</Text>
            <Text style={styles.bottomTabLabel}>Templates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTab} onPress={() => setPhotoModalVisible(true)}>
            <Text style={styles.bottomTabIcon}>📸</Text>
            <Text style={styles.bottomTabLabel}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTab} onPress={onOpenSearch}>
            <Text style={styles.bottomTabIcon}>🔍</Text>
            <Text style={styles.bottomTabLabel}>Discover</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.bottomTab} onPress={onOpenSettings}>
            <Text style={styles.bottomTabIcon}>⚙️</Text>
            <Text style={styles.bottomTabLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Create Project Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Video Project</Text>

            <Text style={styles.inputLabel}>Project Title</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g. Vacation Reel"
              placeholderTextColor={colors.textMuted}
              value={newProjectTitle}
              onChangeText={setNewProjectTitle}
            />

            <Text style={styles.inputLabel}>Aspect Ratio</Text>
            <View style={styles.ratioGrid}>
              {ASPECT_RATIOS.map((item) => (
                <TouchableOpacity
                  key={item.ratio}
                  style={[
                    styles.ratioCard,
                    selectedRatio === item.ratio && styles.ratioCardSelected,
                  ]}
                  onPress={() => setSelectedRatio(item.ratio)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.ratioLabel,
                      selectedRatio === item.ratio && styles.ratioLabelSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                  <Text style={styles.ratioDesc}>{item.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Gallery Import Option */}
            <TouchableOpacity
              style={styles.galleryDirectCreateBtn}
              onPress={handleCreateWithGalleryMedia}
              activeOpacity={0.8}
            >
              <Text style={styles.galleryDirectCreateIcon}>🖼️</Text>
              <Text style={styles.galleryDirectCreateText}>
                Choose Video or Photo from Gallery
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setCreateModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Create Blank"
                variant="primary"
                onPress={handleCreateProject}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Photo Studio / Upload Photo Modal */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Photo Studio & Retouch 📸</Text>
            <Text style={styles.uploadModalSubtitle}>
              Select a photo from your gallery to edit, retouch, remove background, or apply aesthetic filters.
            </Text>

            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={handlePickPhotoFromGallery}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadOptionIcon}>🖼️</Text>
              <View style={styles.uploadOptionTextCol}>
                <Text style={styles.uploadOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.uploadOptionDesc}>
                  Pick from iPhone Photos or Android Gallery
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={handleCapturePhoto}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadOptionIcon}>📸</Text>
              <View style={styles.uploadOptionTextCol}>
                <Text style={styles.uploadOptionTitle}>Take Photo with Camera</Text>
                <Text style={styles.uploadOptionDesc}>
                  Capture a new portrait or object photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.uploadOptionBtn}
              onPress={() => {
                setPhotoModalVisible(false);
                onOpenPhotoEditor();
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.uploadOptionIcon}>✨</Text>
              <View style={styles.uploadOptionTextCol}>
                <Text style={styles.uploadOptionTitle}>Use Sample Stock Photo</Text>
                <Text style={styles.uploadOptionDesc}>
                  Open Photo Studio with sample high-res beach photo
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelUploadBtn}
              onPress={() => setPhotoModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelUploadText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  brandName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  proBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  proBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  settingsBtn: {
    padding: spacing.xs,
  },
  settingsIcon: {
    fontSize: 22,
  },
  searchHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchHeaderIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  searchHeaderPlaceholder: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
  },
  searchBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  searchBadgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  mainScrollView: {
    flex: 1,
  },
  quickToolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    justifyContent: 'space-between',
  },
  quickToolItem: {
    width: '23%',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  quickToolIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
  },
  quickToolIcon: {
    fontSize: 22,
  },
  quickToolBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.accentPink,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
  },
  quickToolBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
  },
  quickToolName: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  heroNewProjectCard: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  heroCircleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  heroCirclePlus: {
    fontSize: 28,
    color: '#000000',
    fontWeight: 'bold',
    marginTop: -2,
  },
  heroTextCol: {
    flex: 1,
  },
  heroActionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  heroActionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  heroScissorsBadge: {
    padding: spacing.xs,
  },
  heroScissorsIcon: {
    fontSize: 24,
  },
  templatesReelSection: {
    marginTop: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  seeAllBtn: {
    padding: spacing.xs,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  templatesCarousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  templateReelCard: {
    width: 140,
    height: 190,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateCardOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing.sm,
    justifyContent: 'flex-end',
  },
  templateReelEmoji: {
    fontSize: 32,
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  templateReelPill: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  templateReelPillText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: 'bold',
  },
  templateReelTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  templateReelSound: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  useTemplatePill: {
    backgroundColor: colors.primary,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  useTemplatePillText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  projectsSection: {
    marginTop: spacing.md,
    paddingBottom: 80,
  },
  projectCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  projectCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnailBox: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
    position: 'relative',
  },
  thumbnailIcon: {
    fontSize: 24,
  },
  durationPill: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 4,
    borderRadius: borderRadius.xs,
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
  },
  projectInfo: {
    flex: 1,
  },
  projectTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  projectDate: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
  },
  actionButton: {
    padding: spacing.xs,
  },
  actionIcon: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: spacing.xl,
    marginTop: spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomTab: {
    alignItems: 'center',
  },
  bottomTabActive: {
    alignItems: 'center',
  },
  bottomTabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  bottomTabLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  bottomTabLabelActive: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  titleInput: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    color: colors.textPrimary,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  ratioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ratioCard: {
    width: '47%',
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratioCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
  },
  ratioLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  ratioLabelSelected: {
    color: colors.primary,
  },
  ratioDesc: {
    color: colors.textMuted,
    fontSize: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
  modalBtn: {
    minWidth: 100,
  },
  galleryDirectCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  galleryDirectCreateIcon: {
    fontSize: 20,
  },
  galleryDirectCreateText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  uploadModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  uploadOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  uploadOptionIcon: {
    fontSize: 26,
  },
  uploadOptionTextCol: {
    flex: 1,
  },
  uploadOptionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  uploadOptionDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  cancelUploadBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
  },
  cancelUploadText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
