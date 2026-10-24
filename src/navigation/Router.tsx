import React, { useState, useEffect, useCallback, createContext, useContext, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  BackHandler,
  Platform,
  Animated,
  Dimensions,
  TouchableOpacity,
  PanResponder,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, borderRadius } from '../theme';
import { useGuaranteedInsets } from './safeArea';
import { HomeScreen } from '../features/home/HomeScreen';
import { EditorScreen } from '../features/editor/EditorScreen';
import { ExportScreen } from '../features/export/ExportScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { PhotoEditorScreen } from '../features/photo/PhotoEditorScreen';
import { TemplatesScreen } from '../features/templates/TemplatesScreen';
import { SearchScreen } from '../features/search/SearchScreen';

export type RootTabName = 'Edit' | 'Templates' | 'Discover' | 'Settings';

export type Route =
  | { name: 'Home' }
  | { name: 'Editor'; projectId: string }
  | { name: 'PhotoEditor'; imageUri?: string }
  | { name: 'Templates' }
  | { name: 'Search' }
  | { name: 'Export'; projectId: string }
  | { name: 'Settings' };

export interface NavigationContextType {
  currentRoute: Route;
  activeTab: RootTabName;
  setActiveTab: (tab: RootTabName) => void;
  navigate: (route: Route) => void;
  goBack: () => boolean;
  canGoBack: boolean;
  replace: (route: Route) => void;
  history: Route[];
}

const NavigationContext = createContext<NavigationContextType | null>(null);

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within an AppRouter/NavigationContext');
  }
  return context;
};

export const AppRouter: React.FC = () => {
  const insets = useGuaranteedInsets();
  const screenWidth = Dimensions.get('window').width;

  const [activeTab, setActiveTab] = useState<RootTabName>('Edit');
  const [history, setHistory] = useState<Route[]>([{ name: 'Home' }]);

  const currentRoute = history[history.length - 1];
  const isStackScreen = history.length > 1;

  // Animated Values for Smooth Screen Transitions
  const animTranslateX = useRef(new Animated.Value(0)).current;
  const animOpacity = useRef(new Animated.Value(1)).current;

  // Animate Screen In when pushing to stack
  const animateScreenIn = useCallback(() => {
    animTranslateX.setValue(screenWidth);
    animOpacity.setValue(0.7);

    Animated.parallel([
      Animated.timing(animTranslateX, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animTranslateX, animOpacity, screenWidth]);

  // Navigate: Push new screen onto stack with slide animation
  const navigate = useCallback(
    (route: Route) => {
      // Map tab shortcuts if user navigated directly
      if (route.name === 'Templates') {
        setActiveTab('Templates');
        if (history.length > 1) {
          setHistory([{ name: 'Home' }]);
        }
        return;
      }
      if (route.name === 'Search') {
        setActiveTab('Discover');
        if (history.length > 1) {
          setHistory([{ name: 'Home' }]);
        }
        return;
      }
      if (route.name === 'Settings') {
        setActiveTab('Settings');
        if (history.length > 1) {
          setHistory([{ name: 'Home' }]);
        }
        return;
      }

      setHistory((prev) => [...prev, route]);
      animateScreenIn();
    },
    [animateScreenIn, history.length]
  );

  const replace = useCallback((route: Route) => {
    setHistory((prev) => [...prev.slice(0, -1), route]);
  }, []);

  // Animate Screen Out when popping from stack
  const goBack = useCallback((): boolean => {
    if (history.length > 1) {
      Animated.timing(animTranslateX, {
        toValue: screenWidth,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        animTranslateX.setValue(0);
        setHistory((prev) => prev.slice(0, -1));
      });
      return true;
    }

    // If on a secondary tab, return to primary Edit tab
    if (activeTab !== 'Edit') {
      setActiveTab('Edit');
      return true;
    }

    return false;
  }, [history.length, activeTab, animTranslateX, screenWidth]);

  // Modern Android Hardware Back & Predictive Edge Gesture Handler
  useEffect(() => {
    const handleHardwareBack = () => {
      if (history.length > 1) {
        goBack();
        return true; // Handled back stack pop
      }
      if (activeTab !== 'Edit') {
        setActiveTab('Edit');
        return true; // Handled return to primary tab
      }
      return false; // Exit app on root Edit tab
    };

    const backHandlerSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBack
    );

    return () => backHandlerSubscription.remove();
  }, [history.length, activeTab, goBack]);

  // Interactive Edge-Swipe-To-Go-Back PanResponder (iOS & Android gesture navigation)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => {
          // Detect thumb swipe from left screen edge (< 45px) moving right
          return (
            history.length > 1 &&
            gestureState.x0 < 45 &&
            gestureState.dx > 12 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
          );
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx > 0) {
            animTranslateX.setValue(gestureState.dx);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx > 90 || gestureState.vx > 0.45) {
            // User swiped past threshold: complete transition and pop
            Animated.timing(animTranslateX, {
              toValue: screenWidth,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              animTranslateX.setValue(0);
              setHistory((prev) => prev.slice(0, -1));
            });
          } else {
            // User released early: spring back to 0
            Animated.spring(animTranslateX, {
              toValue: 0,
              useNativeDriver: true,
              bounciness: 4,
            }).start();
          }
        },
      }),
    [history.length, screenWidth, animTranslateX]
  );

  const navContextValue: NavigationContextType = {
    currentRoute,
    activeTab,
    setActiveTab,
    navigate,
    goBack,
    canGoBack: history.length > 1 || activeTab !== 'Edit',
    replace,
    history,
  };

  // Render Root Tab Content
  const renderRootTabContent = () => {
    switch (activeTab) {
      case 'Edit':
        return (
          <HomeScreen
            onOpenProject={(projectId) => navigate({ name: 'Editor', projectId })}
            onOpenPhotoEditor={(imageUri?: string) => navigate({ name: 'PhotoEditor', imageUri })}
            onOpenTemplates={() => setActiveTab('Templates')}
            onOpenSearch={() => setActiveTab('Discover')}
            onOpenSettings={() => setActiveTab('Settings')}
            hideBottomBar={true}
          />
        );
      case 'Templates':
        return (
          <TemplatesScreen
            onBack={() => setActiveTab('Edit')}
            onOpenProject={(projectId) => navigate({ name: 'Editor', projectId })}
            onOpenSearch={() => setActiveTab('Discover')}
          />
        );
      case 'Discover':
        return (
          <SearchScreen
            onBack={() => setActiveTab('Edit')}
            onOpenTemplates={() => setActiveTab('Templates')}
            onSelectTemplate={() => setActiveTab('Templates')}
          />
        );
      case 'Settings':
        return <SettingsScreen onBack={() => setActiveTab('Edit')} />;
      default:
        return null;
    }
  };

  // Render Fullscreen Stack Screen
  const renderStackScreen = () => {
    switch (currentRoute.name) {
      case 'Editor':
        return (
          <EditorScreen
            projectId={currentRoute.projectId}
            onBack={goBack}
            onExport={(projectId) => navigate({ name: 'Export', projectId })}
          />
        );
      case 'PhotoEditor':
        return (
          <PhotoEditorScreen
            onBack={goBack}
            initialImageUri={currentRoute.imageUri}
            onSaveComplete={() => goBack()}
          />
        );
      case 'Export':
        return (
          <ExportScreen
            projectId={currentRoute.projectId}
            onBack={goBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <NavigationContext.Provider value={navContextValue}>
      <View style={styles.appContainer}>
        <StatusBar style="light" />

        {/* Root Tabs View (when on base navigation) */}
        {!isStackScreen && (
          <View style={styles.tabContentContainer}>{renderRootTabContent()}</View>
        )}

        {/* Stack Screen View with Smooth Slide Animation and Edge Swipe Gesture */}
        {isStackScreen && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.stackScreenContainer,
              {
                transform: [{ translateX: animTranslateX }],
                opacity: animOpacity,
              },
            ]}
          >
            {renderStackScreen()}
          </Animated.View>
        )}

        {/* Universal CapCut Bottom Navigation Bar (Active on Root Tabs) */}
        {!isStackScreen && (
          <View
            style={[
              styles.bottomTabBar,
              {
                paddingBottom: insets.bottom,
                height: 56 + insets.bottom,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('Edit')}
              activeOpacity={0.7}
              accessibilityLabel="Edit tab"
              accessibilityRole="tab"
            >
              <Text style={styles.tabIcon}>✂️</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Edit' && styles.tabLabelActive,
                ]}
              >
                Edit
              </Text>
              {activeTab === 'Edit' && <View style={styles.activeIndicatorDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('Templates')}
              activeOpacity={0.7}
              accessibilityLabel="Templates tab"
              accessibilityRole="tab"
            >
              <Text style={styles.tabIcon}>🪄</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Templates' && styles.tabLabelActive,
                ]}
              >
                Templates
              </Text>
              {activeTab === 'Templates' && <View style={styles.activeIndicatorDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => navigate({ name: 'PhotoEditor' })}
              activeOpacity={0.7}
              accessibilityLabel="Photo Studio"
              accessibilityRole="tab"
            >
              <Text style={styles.tabIcon}>📸</Text>
              <Text style={styles.tabLabel}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('Discover')}
              activeOpacity={0.7}
              accessibilityLabel="Discover tab"
              accessibilityRole="tab"
            >
              <Text style={styles.tabIcon}>🔍</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Discover' && styles.tabLabelActive,
                ]}
              >
                Discover
              </Text>
              {activeTab === 'Discover' && <View style={styles.activeIndicatorDot} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('Settings')}
              activeOpacity={0.7}
              accessibilityLabel="Settings tab"
              accessibilityRole="tab"
            >
              <Text style={styles.tabIcon}>⚙️</Text>
              <Text
                style={[
                  styles.tabLabel,
                  activeTab === 'Settings' && styles.tabLabelActive,
                ]}
              >
                Settings
              </Text>
              {activeTab === 'Settings' && <View style={styles.activeIndicatorDot} />}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </NavigationContext.Provider>
  );
};

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContentContainer: {
    flex: 1,
  },
  stackScreenContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.background,
    zIndex: 200,
  },
  bottomTabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing.xs,
    elevation: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeIndicatorDot: {
    position: 'absolute',
    top: 2,
    right: '25%',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
  },
});
