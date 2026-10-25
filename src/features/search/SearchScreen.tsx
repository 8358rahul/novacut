import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/Header';
import { Badge } from '../../components/Badge';
import {
  searchCatalog,
  searchHistoryManager,
  SearchCategoryFilter,
  SearchResultItem,
  TRENDING_TAGS,
} from '../../core/search/searchEngine';
import { TemplateDefinition } from '../../core/templates/templateEngine';
import { useGuaranteedInsets } from '../../navigation/safeArea';

export interface SearchScreenProps {
  onBack: () => void;
  onSelectTemplate?: (template: TemplateDefinition) => void;
  onOpenTemplates?: () => void;
}

const CATEGORY_TABS: { id: SearchCategoryFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'templates', label: 'Templates' },
  { id: 'effects', label: 'Effects & LUTs' },
  { id: 'audio', label: 'Music & Audio' },
];

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack,
  onSelectTemplate,
  onOpenTemplates,
}) => {
  const insets = useGuaranteedInsets();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SearchCategoryFilter>('all');
  const [history, setHistory] = useState<string[]>(() => searchHistoryManager.getHistory());

  const searchResults = useMemo(() => {
    return searchCatalog(query, selectedCategory);
  }, [query, selectedCategory]);

  const handleSearchSubmit = (text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      searchHistoryManager.addTerm(trimmed);
      setHistory(searchHistoryManager.getHistory());
      setQuery(trimmed);
    }
  };

  const handleClearHistory = () => {
    searchHistoryManager.clearHistory();
    setHistory([]);
  };

  const handleSelectResult = (item: SearchResultItem) => {
    searchHistoryManager.addTerm(item.title);
    setHistory(searchHistoryManager.getHistory());

    if (item.type === 'template' && onSelectTemplate && item.payload) {
      onSelectTemplate(item.payload);
    } else if (item.type === 'template' && onOpenTemplates) {
      onOpenTemplates();
    } else if (item.type === 'audio') {
      Alert.alert(
        'Audio Track Selected',
        `"${item.title}" by ${(item.payload as any)?.artist || 'NovaStudio'} is ready for your timeline.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Effect Selected',
        `"${item.title}" (${item.category}) applied to effect preset catalog.`,
        [{ text: 'OK' }]
      );
    }
  };

  const renderResultItem = ({ item }: { item: SearchResultItem }) => {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        activeOpacity={0.75}
        onPress={() => handleSelectResult(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: item.accentColor || colors.surfaceLight }]}>
          <Text style={styles.resultIcon}>{item.icon}</Text>
        </View>

        <View style={styles.resultDetails}>
          <View style={styles.titleRow}>
            <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
            <Badge
              label={item.type.toUpperCase()}
              variant={item.type === 'template' ? 'primary' : 'muted'}
            />
          </View>
          <Text style={styles.resultSubtitle} numberOfLines={1}>{item.subtitle}</Text>
          <View style={styles.tagRow}>
            {item.tags.slice(0, 3).map((tag) => (
              <Text key={tag} style={styles.resultTag}>{tag}</Text>
            ))}
          </View>
        </View>

        <View style={styles.actionArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-background w-full items-center">
      <View className="w-full max-w-4xl flex-1">
        <Header title="Discover & Search" onBack={onBack} />

      {/* CapCut-style Search Bar Input */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputBox}>
          <Text style={styles.searchIconPrefix}>🔍</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search templates, effects, music, or tags..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => handleSearchSubmit(query)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Pills */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {CATEGORY_TABS.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.categoryPill, selectedCategory === tab.id && styles.categoryPillActive]}
              onPress={() => setSelectedCategory(tab.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === tab.id && styles.categoryTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content: Either Empty State Discovery or Active Search Results */}
      {query.length === 0 ? (
        <ScrollView style={styles.discoveryScroll} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {history.length > 0 && (
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.clearHistoryText}>Clear</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.pillWrap}>
                {history.map((term, index) => (
                  <TouchableOpacity
                    key={`${term}_${index}`}
                    style={styles.historyPill}
                    onPress={() => {
                      setQuery(term);
                      handleSearchSubmit(term);
                    }}
                  >
                    <Text style={styles.historyClock}>🕒</Text>
                    <Text style={styles.historyTerm}>{term}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Trending Hashtags & Topics */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Trending on NovaCut 🔥</Text>
            <View style={styles.pillWrap}>
              {TRENDING_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={styles.trendingPill}
                  onPress={() => {
                    setQuery(tag);
                    handleSearchSubmit(tag);
                  }}
                >
                  <Text style={styles.trendingTagText}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Popular Suggested Items Overview */}
          <View style={styles.sectionBox}>
            <Text style={styles.sectionTitle}>Featured Items</Text>
            {searchResults.slice(0, 4).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.resultCard}
                onPress={() => handleSelectResult(item)}
              >
                <View style={[styles.iconContainer, { backgroundColor: item.accentColor }]}>
                  <Text style={styles.resultIcon}>{item.icon}</Text>
                </View>
                <View style={styles.resultDetails}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
                </View>
                <Text style={styles.arrowText}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        /* Results List */
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={renderResultItem}
          contentContainerStyle={[styles.resultsList, { paddingBottom: 40 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptySubtitle}>Try searching for "Beat Sync", "Travel", "Glitch", or "Lo-Fi".</Text>
            </View>
          }
        />
      )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchBarContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.timelineBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIconPrefix: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: spacing.xs,
  },
  clearBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.sm,
  },
  categoryScroll: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.timelineBg,
  },
  categoryPillActive: {
    backgroundColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  discoveryScroll: {
    flex: 1,
    padding: spacing.md,
  },
  sectionBox: {
    marginBottom: spacing.lg,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  clearHistoryText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  historyClock: {
    fontSize: 10,
  },
  historyTerm: {
    color: colors.textPrimary,
    fontSize: 12,
  },
  trendingPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  trendingTagText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  resultsList: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm + 2,
  },
  resultIcon: {
    fontSize: 22,
  },
  resultDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  resultTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.xs,
  },
  resultSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  resultTag: {
    color: colors.textMuted,
    fontSize: 10,
  },
  actionArrow: {
    paddingLeft: spacing.sm,
  },
  arrowText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
