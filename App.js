import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";

const envBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
const API_BASE_URL =
  envBaseUrl || Constants?.expoConfig?.extra?.apiBaseUrl || "http://localhost:3000/api/pet";

const ATTRIBUTE_OPTIONS = [
  { key: "estadoEmocional", label: "Estado emocional" },
  { key: "hambre", label: "Hambre" },
  { key: "felicidad", label: "Felicidad" },
  { key: "energia", label: "Energía" },
];

const ACTION_OPTIONS = [
  { action: "alimentar", label: "Alimentar" },
  { action: "jugar", label: "Jugar" },
  { action: "descansar", label: "Descansar" },
  { action: "limpieza", label: "Limpieza" },
];

const QUICK_ACTIONS = ACTION_OPTIONS.slice(0, 3);

const SCENE_OPTIONS = [
  {
    key: "livingRoom",
    label: "Sala",
    image: require("./assets/scenes/scene-sala.png"),
  },
  {
    key: "bedroom",
    label: "Dormir",
    image: require("./assets/scenes/scene-dormir.png"),
  },
  {
    key: "garden",
    label: "Jardín",
    image: require("./assets/scenes/scene-jardin.png"),
  },
];

const DEFAULT_STATUS = {
  name: "Pixel",
  estadoEmocional: "Feliz",
  hambre: 45,
  felicidad: 80,
  energia: 65,
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const STORE_PANEL_WIDTH = Math.min(SCREEN_WIDTH * 0.92, 420);

const WARDROBE_COLLECTIONS = [
  {
    id: "coleccion-gala",
    name: "Colección de gala",
    description: "Trajes elegantes listos para eventos especiales.",
    level: "Nv. 5",
    status: "Disponible",
    icon: "🎩",
    accentColor: "#f6c26b",
    tag: "Elegante",
    equipped: true,
  },
  {
    id: "coleccion-urbana",
    name: "Colección urbana",
    description: "Estilo relajado con toques modernos y vibrantes.",
    level: "Nv. 3",
    status: "Nuevo",
    icon: "🧢",
    accentColor: "#60a5fa",
    tag: "Casual",
    equipped: false,
  },
  {
    id: "coleccion-festival",
    name: "Colección festival",
    description: "Accesorios coloridos perfectos para celebraciones.",
    level: "Nv. 4",
    status: "Destacado",
    icon: "🎉",
    accentColor: "#f472b6",
    tag: "Festivo",
    equipped: false,
  },
  {
    id: "coleccion-aventura",
    name: "Colección aventura",
    description: "Prendas resistentes para explorar sin límites.",
    level: "Nv. 2",
    status: "Disponible",
    icon: "🎒",
    accentColor: "#34d399",
    tag: "Aventura",
    equipped: false,
  },
  {
    id: "coleccion-retro",
    name: "Colección retro",
    description: "Un viaje nostálgico con colores clásicos.",
    level: "Nv. 6",
    status: "Limitado",
    icon: "📼",
    accentColor: "#f59e0b",
    tag: "Vintage",
    equipped: false,
  },
  {
    id: "coleccion-invierno",
    name: "Colección invierno",
    description: "Abrigos cálidos y gorros suaves para el frío.",
    level: "Nv. 1",
    status: "Disponible",
    icon: "🧣",
    accentColor: "#818cf8",
    tag: "Temporada",
    equipped: false,
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatPercentage(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "N/D";
  }
  const clamped = clamp(value, 0, 100);
  return `${clamped}%`;
}

function getAttributeDetails(status, attributeKey) {
  switch (attributeKey) {
    case "estadoEmocional":
      return {
        title: "Estado emocional",
        description: status.estadoEmocional || "Sin información disponible",
      };
    case "hambre":
      return {
        title: "Nivel de hambre",
        description: `Nivel actual: ${formatPercentage(status.hambre)}`,
        numericValue: status.hambre,
      };
    case "felicidad":
      return {
        title: "Nivel de felicidad",
        description: `Nivel actual: ${formatPercentage(status.felicidad)}`,
        numericValue: status.felicidad,
      };
    case "energia":
      return {
        title: "Nivel de energía",
        description: `Nivel actual: ${formatPercentage(status.energia)}`,
        numericValue: status.energia,
      };
    default:
      return {
        title: attributeKey,
        description: "Sin información disponible",
      };
  }
}

export default function App() {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [selectedScene, setSelectedScene] = useState(SCENE_OPTIONS[0].key);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [attributeMenuOpen, setAttributeMenuOpen] = useState(false);
  const [selectedAttributeKey, setSelectedAttributeKey] = useState(
    ATTRIBUTE_OPTIONS[0].key
  );
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [selectedActionKey, setSelectedActionKey] = useState(
    ACTION_OPTIONS[0].action
  );
  const [customNote, setCustomNote] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeAnimating, setStoreAnimating] = useState(false);
  const storeProgress = useRef(new Animated.Value(0)).current;
  const storeTranslateX = useMemo(
    () =>
      storeProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [-SCREEN_WIDTH, 0],
      }),
    [storeProgress]
  );
  const storeBackdropOpacity = useMemo(
    () =>
      storeProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.45],
      }),
    [storeProgress]
  );
  const showStoreOverlay = storeOpen || storeAnimating;

  useEffect(() => {
    refreshStatus();
  }, []);

  useEffect(() => {
    if (!sheetVisible) {
      setAttributeMenuOpen(false);
      setActionMenuOpen(false);
    }
  }, [sheetVisible]);

  const openWardrobeStore = useCallback(() => {
    if (storeOpen || storeAnimating) {
      return;
    }
    setStoreOpen(true);
    setStoreAnimating(true);
    Animated.timing(storeProgress, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start(() => {
      setStoreAnimating(false);
    });
  }, [storeAnimating, storeOpen, storeProgress]);

  const closeWardrobeStore = useCallback(() => {
    if (!storeOpen || storeAnimating) {
      return;
    }
    setStoreAnimating(true);
    Animated.timing(storeProgress, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start(() => {
      setStoreAnimating(false);
      setStoreOpen(false);
    });
  }, [storeAnimating, storeOpen, storeProgress]);

  const selectedSceneConfig = useMemo(() => {
    return (
      SCENE_OPTIONS.find((scene) => scene.key === selectedScene) || SCENE_OPTIONS[0]
    );
  }, [selectedScene]);

  const selectedActionConfig = useMemo(() => {
    return (
      ACTION_OPTIONS.find((option) => option.action === selectedActionKey) ||
      ACTION_OPTIONS[0]
    );
  }, [selectedActionKey]);

  const attributeDetails = useMemo(
    () => getAttributeDetails(status, selectedAttributeKey),
    [status, selectedAttributeKey]
  );

  const attributeProgressPercent = useMemo(() => {
    if (typeof attributeDetails.numericValue === "number") {
      return clamp(attributeDetails.numericValue, 0, 100);
    }
    return null;
  }, [attributeDetails]);

  const wardrobeKeyExtractor = useCallback((item) => item.id, []);

  const renderWardrobeItem = useCallback(({ item }) => {
    return (
      <View style={[styles.outfitCard, { borderColor: item.accentColor }]}>
        <View style={styles.outfitBadgeRow}>
          <View
            style={[
              styles.outfitStatusPill,
              item.equipped && [
                styles.outfitStatusPillActive,
                { backgroundColor: item.accentColor },
              ],
            ]}
          >
            <Text
              style={[
                styles.outfitStatusPillLabel,
                item.equipped && styles.outfitStatusPillLabelActive,
              ]}
            >
              {item.equipped ? "Equipado" : item.status}
            </Text>
          </View>
          <View style={styles.outfitLevelPill}>
            <Text style={styles.outfitLevelPillLabel}>{item.level}</Text>
          </View>
        </View>
        <View style={styles.outfitIconWrapper}>
          <Text style={styles.outfitIcon}>{item.icon}</Text>
        </View>
        <Text style={styles.outfitName}>{item.name}</Text>
        <Text style={styles.outfitDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.outfitTagPill}>
          <Text style={styles.outfitTagLabel}>{item.tag}</Text>
        </View>
      </View>
    );
  }, []);

  const openStorePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (storeOpen || storeAnimating) {
            return false;
          }
          const horizontalMove = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return horizontalMove && gestureState.dx > 20;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx > 80) {
            openWardrobeStore();
          }
        },
      }),
    [openWardrobeStore, storeAnimating, storeOpen]
  );

  const storePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gestureState) => {
          if (!storeOpen || storeAnimating) {
            return false;
          }
          const horizontalMove = Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return horizontalMove && gestureState.dx < -20;
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dx < -60) {
            closeWardrobeStore();
          }
        },
      }),
    [closeWardrobeStore, storeAnimating, storeOpen]
  );

  const appendLog = useCallback((message) => {
    setLogEntries((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
        message,
      },
      ...current,
    ]);
  }, []);

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/status`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }
      const data = await response.json();
      if (data) {
        setStatus((current) => ({
          ...current,
          ...data,
        }));
        setLastUpdatedAt(Date.now());
      }
      appendLog(data?.message || "Estado actualizado correctamente.");
    } catch (error) {
      appendLog(
        "No se pudo conectar con el backend. Verifica la URL configurada."
      );
    } finally {
      setIsRefreshing(false);
    }
  }, [appendLog]);

  const performAction = useCallback(
    async (action, note = "") => {
      appendLog(`Acción enviada: ${action}${note ? ` · Nota: ${note}` : ""}`);
      try {
        const response = await fetch(`${API_BASE_URL}/interactions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action, message: note }),
        });
        if (!response.ok) {
          throw new Error(`Error ${response.status}`);
        }
        const data = await response.json();
        if (data?.status) {
          setStatus((current) => ({
            ...current,
            ...data.status,
          }));
          setLastUpdatedAt(Date.now());
        }
        appendLog(data?.message || "La mascota respondió a tu acción.");
      } catch (error) {
        appendLog(
          "Ocurrió un error al enviar la acción. Revisa tu servidor backend."
        );
        throw error;
      }
    },
    [appendLog]
  );

  const handleSubmitCustomAction = useCallback(async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await performAction(selectedActionKey, customNote.trim());
      setCustomNote("");
    } catch (error) {
      // El error ya fue registrado en el log por performAction.
    } finally {
      setIsSubmitting(false);
    }
  }, [customNote, isSubmitting, performAction, selectedActionKey]);

  const handleQuickAction = useCallback(
    (action) => {
      performAction(action).catch(() => {
        // El error ya fue registrado en el log dentro de performAction.
      });
    },
    [performAction]
  );

  const clearLog = useCallback(() => {
    setLogEntries([]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} {...openStorePanResponder.panHandlers}>
      <StatusBar style="light" />
      <ImageBackground
        source={selectedSceneConfig.image}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        <View style={styles.sceneOverlay}>
          <View style={styles.topBar}>
            <Text style={styles.topBarLabel}>Mascota virtual</Text>
            <Pressable
              accessibilityLabel="Abrir panel de control"
              accessibilityRole="button"
              onPress={() => setSheetVisible(true)}
              style={styles.panelButton}
            >
              <Text style={styles.panelButtonText}>Abrir panel</Text>
            </Pressable>
          </View>

          <View style={styles.sceneSpacer} />

          <View style={styles.sheetHint}>
            <Text style={styles.sheetHintText}>
              Toca “Abrir panel” para ver estado, acciones y registro.
            </Text>
          </View>

          <View style={styles.tabBar}>
            {SCENE_OPTIONS.map((scene) => {
              const isActive = scene.key === selectedSceneConfig.key;
              return (
                <Pressable
                  key={scene.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setSelectedScene(scene.key)}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                >
                  <Text
                    style={[
                      styles.tabButtonLabel,
                      isActive && styles.tabButtonLabelActive,
                    ]}
                  >
                    {scene.label}
                  </Text>
                </Pressable>
              );
})}
          </View>
        </View>
      </ImageBackground>

      <Modal animationType="slide" transparent visible={sheetVisible}>
        <View style={styles.sheetWrapper}>
          <Pressable
            accessibilityLabel="Cerrar panel"
            onPress={() => setSheetVisible(false)}
            style={styles.sheetBackdrop}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView
              contentContainerStyle={styles.sheetContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sheetHeaderRow}>
                <View>
                  <Text style={styles.sheetTitle}>{status.name || "Tu mascota"}</Text>
                  {lastUpdatedAt ? (
                    <Text style={styles.sheetSubtitle}>
                      Última actualización: {new Date(lastUpdatedAt).toLocaleString()}
                    </Text>
                  ) : (
                    <Text style={styles.sheetSubtitle}>
                      Actualiza para sincronizar con el backend.
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={refreshStatus}
                  style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
                  disabled={isRefreshing}
                >
                  <Text style={styles.refreshButtonText}>
                    {isRefreshing ? "Actualizando…" : "Actualizar"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Atributos</Text>
                <View style={styles.dropdownContainer}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setAttributeMenuOpen((value) => !value)}
                    style={styles.dropdownTrigger}
                  >
                    <Text style={styles.dropdownTriggerText}>
                      {
                        ATTRIBUTE_OPTIONS.find(
                          (option) => option.key === selectedAttributeKey
                        )?.label
                      }
                    </Text>
                  </Pressable>
                  {attributeMenuOpen && (
                    <View style={styles.dropdownMenu}>
                      {ATTRIBUTE_OPTIONS.map((option) => {
                        const selected = option.key === selectedAttributeKey;
                        return (
                          <Pressable
                            key={option.key}
                            onPress={() => {
                              setSelectedAttributeKey(option.key);
                              setAttributeMenuOpen(false);
                            }}
                            style={[
                              styles.dropdownItem,
                              selected && styles.dropdownItemSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownItemLabel,
                                selected && styles.dropdownItemLabelSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
                <View style={styles.attributeCard}>
                  <Text style={styles.attributeTitle}>{attributeDetails.title}</Text>
                  <Text style={styles.attributeDescription}>
                    {attributeDetails.description}
                  </Text>
                  {attributeProgressPercent !== null && (
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${attributeProgressPercent}%` },
                        ]}
                      />
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Acciones rápidas</Text>
                <View style={styles.quickActionsRow}>
                  {QUICK_ACTIONS.map((actionOption) => (
                    <Pressable
                      key={actionOption.action}
                      accessibilityRole="button"
                      onPress={() => handleQuickAction(actionOption.action)}
                      style={styles.quickActionButton}
                    >
                      <Text style={styles.quickActionLabel}>
                        {actionOption.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Enviar acción personalizada</Text>
                <View style={styles.dropdownContainer}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setActionMenuOpen((value) => !value)}
                    style={styles.dropdownTrigger}
                  >
                    <Text style={styles.dropdownTriggerText}>
                      {selectedActionConfig.label}
                    </Text>
                  </Pressable>
                  {actionMenuOpen && (
                    <View style={styles.dropdownMenu}>
                      {ACTION_OPTIONS.map((option) => {
                        const selected = option.action === selectedActionKey;
                        return (
                          <Pressable
                            key={option.action}
                            onPress={() => {
                              setSelectedActionKey(option.action);
                              setActionMenuOpen(false);
                            }}
                            style={[
                              styles.dropdownItem,
                              selected && styles.dropdownItemSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dropdownItemLabel,
                                selected && styles.dropdownItemLabelSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
                <TextInput
                  multiline
                  onChangeText={setCustomNote}
                  placeholder="Añade un mensaje (opcional)"
                  placeholderTextColor="rgba(22, 28, 32, 0.45)"
                  style={styles.noteInput}
                  value={customNote}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={isSubmitting}
                  onPress={handleSubmitCustomAction}
                  style={[
                    styles.submitButton,
                    isSubmitting && styles.submitButtonDisabled,
                  ]}
                >
                  <Text style={styles.submitButtonText}>
                    {isSubmitting ? "Enviando…" : "Enviar acción"}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Registro de actividad</Text>
                  <Pressable onPress={clearLog} style={styles.clearLogButton}>
                    <Text style={styles.clearLogLabel}>Limpiar</Text>
                  </Pressable>
                </View>
                {logEntries.length === 0 ? (
                  <Text style={styles.emptyLogText}>
                    Todavía no hay actividad registrada.
                  </Text>
                ) : (
                  <FlatList
                    data={logEntries}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <View style={styles.logItem}>
                        <Text style={styles.logTimestamp}>
                          {new Date(item.timestamp).toLocaleString()}
                        </Text>
                        <Text style={styles.logMessage}>{item.message}</Text>
                      </View>
                    )}
                    scrollEnabled={false}
                    ItemSeparatorComponent={() => <View style={styles.logDivider} />}
                  />
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {showStoreOverlay && (
        <View style={styles.storeOverlay} pointerEvents="box-none">
          <Animated.View
            style={[styles.storeScrim, { opacity: storeBackdropOpacity }]}
            pointerEvents={storeOpen ? "auto" : "none"}
          >
            <Pressable
              accessibilityLabel="Cerrar tienda de atuendos"
              onPress={closeWardrobeStore}
              style={styles.storeScrimTouchable}
            />
          </Animated.View>
          <Animated.View
            style={[styles.storePanel, { transform: [{ translateX: storeTranslateX }] }]}
            {...storePanResponder.panHandlers}
          >
            <SafeAreaView style={styles.storeSafeArea}>
              <View style={styles.storeContent}>
                <View style={styles.storeHeader}>
                  <View style={styles.storeHeaderTopRow}>
                    <View style={styles.storeTitleGroup}>
                      <Text style={styles.storeTitle}>Atuendos</Text>
                      <Text style={styles.storeTitleSubtitle}>
                        Selecciona tu estilo favorito
                      </Text>
                    </View>
                    <Pressable
                      accessibilityLabel="Cerrar tienda"
                      onPress={closeWardrobeStore}
                      style={styles.storeCloseButton}
                    >
                      <Text style={styles.storeCloseButtonLabel}>Cerrar</Text>
                    </Pressable>
                  </View>
                  <View style={styles.storeToolbarRow}>
                    <View style={styles.storeLabelPill}>
                      <Text style={styles.storeLabelPillText}>Atuendos</Text>
                    </View>
                    <View style={[styles.storeToolbarButton, styles.storeToolbarButtonActive]}>
                      <View style={styles.storeToolbarIconBubble}>
                        <Text style={styles.storeToolbarIcon}>🛍️</Text>
                      </View>
                      <Text style={styles.storeToolbarButtonLabel}>Shop</Text>
                    </View>
                  </View>
                </View>
                <FlatList
                  data={WARDROBE_COLLECTIONS}
                  keyExtractor={wardrobeKeyExtractor}
                  renderItem={renderWardrobeItem}
                  numColumns={2}
                  columnWrapperStyle={styles.outfitColumnWrapper}
                  contentContainerStyle={styles.outfitListContent}
                  showsVerticalScrollIndicator={false}
                  ListHeaderComponent={
                    <View style={styles.storeCollectionsHeader}>
                      <Text style={styles.storeCollectionsTitle}>
                        Colecciones de vestimenta
                      </Text>
                      <Text style={styles.storeCollectionsSubtitle}>
                        Explora y combina atuendos para tu mascota virtual.
                      </Text>
                    </View>
                  }
                  ListFooterComponent={<View style={styles.storeFooterSpacer} />}
                />
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  background: {
    flex: 1,
  },
  backgroundImage: {
    resizeMode: "cover",
  },
  sceneOverlay: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  topBarLabel: {
    color: "#fdfdfd",
    fontSize: 16,
    fontWeight: "600",
  },
  panelButton: {
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  panelButtonText: {
    color: "#2c2c2c",
    fontWeight: "600",
    fontSize: 14,
  },
  sceneSpacer: {
    flex: 1,
  },
  sheetHint: {
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginBottom: 24,
  },
  sheetHintText: {
    color: "#f1f5f9",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.82)",
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#f6c26b",
  },
  tabButtonLabel: {
    color: "#3c3c3c",
    fontSize: 14,
    fontWeight: "600",
  },
  tabButtonLabelActive: {
    color: "#2f1c05",
  },
  sheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  sheet: {
    backgroundColor: "#fffaf2",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "82%",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.22)",
    marginVertical: 12,
  },
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2933",
  },
  sheetSubtitle: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  refreshButton: {
    backgroundColor: "#f6c26b",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    fontWeight: "600",
    color: "#2c1810",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2933",
    marginBottom: 16,
  },
  dropdownContainer: {
    position: "relative",
    marginBottom: 16,
  },
  dropdownTrigger: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  dropdownTriggerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2933",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 8,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.14,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 6,
    overflow: "hidden",
    zIndex: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemSelected: {
    backgroundColor: "#fef3c7",
  },
  dropdownItemLabel: {
    fontSize: 15,
    color: "#1f2933",
  },
  dropdownItemLabelSelected: {
    fontWeight: "700",
    color: "#92400e",
  },
  attributeCard: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.05)",
  },
  attributeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2933",
    marginBottom: 8,
  },
  attributeDescription: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    backgroundColor: "rgba(148, 163, 184, 0.25)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f59e0b",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2933",
  },
  noteInput: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 90,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginBottom: 16,
    fontSize: 15,
    color: "#1f2933",
  },
  submitButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2933",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  clearLogButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  clearLogLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2933",
  },
  emptyLogText: {
    fontSize: 14,
    color: "#475569",
  },
  logItem: {
    paddingVertical: 8,
  },
  logTimestamp: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 2,
  },
  logMessage: {
    fontSize: 14,
    color: "#1f2933",
  },
  logDivider: {
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.25)",
  },
  storeOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  storeScrim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },
  storeScrimTouchable: {
    flex: 1,
  },
  storePanel: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: STORE_PANEL_WIDTH,
    backgroundColor: "#fff6e4",
    shadowColor: "#0f172a",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 18,
  },
  storeSafeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  storeContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  storeHeader: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginBottom: 16,
  },
  storeHeaderTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  storeTitleGroup: {
    gap: 6,
  },
  storeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2f1c05",
  },
  storeTitleSubtitle: {
    fontSize: 13,
    color: "#6b7280",
  },
  storeCloseButton: {
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  storeCloseButtonLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2933",
  },
  storeToolbarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  storeLabelPill: {
    backgroundColor: "#fef3c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  storeLabelPillText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b45309",
  },
  storeToolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  storeToolbarButtonActive: {
    backgroundColor: "#f6c26b",
    borderColor: "#f59e0b",
  },
  storeToolbarIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  storeToolbarIcon: {
    fontSize: 18,
  },
  storeToolbarButtonLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2f1c05",
  },
  storeCollectionsHeader: {
    marginBottom: 16,
  },
  storeCollectionsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2933",
  },
  storeCollectionsSubtitle: {
    fontSize: 13,
    color: "#475569",
    marginTop: 4,
  },
  storeFooterSpacer: {
    height: 40,
  },
  outfitListContent: {
    paddingBottom: 16,
  },
  outfitColumnWrapper: {
    gap: 12,
  },
  outfitCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
  },
  outfitBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  outfitStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  outfitStatusPillActive: {
    shadowColor: "#f6c26b",
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  outfitStatusPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2933",
  },
  outfitStatusPillLabelActive: {
    color: "#2f1c05",
  },
  outfitLevelPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  outfitLevelPillLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2933",
  },
  outfitIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  outfitIcon: {
    fontSize: 36,
  },
  outfitName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2933",
    marginBottom: 6,
  },
  outfitDescription: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
  },
  outfitTagPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
  },
  outfitTagLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
  },
});
