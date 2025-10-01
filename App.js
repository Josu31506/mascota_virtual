import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
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
  envBaseUrl ||
  Constants?.expoConfig?.extra?.apiBaseUrl ||
  "http://localhost:3000/api/pet";

const ATTRIBUTE_OPTIONS = [
  { key: "estadoEmocional", label: "Estado emocional" },
  { key: "hambre", label: "Hambre" },
  { key: "felicidad", label: "Felicidad" },
  { key: "energia", label: "Energía" },
];

const SCENE_OPTIONS = [
  {
    key: "livingRoom",
    label: "Sala",
    backgroundColor: "#fef4e7",
    floorColor: "#f6d7aa",
    accentColor: "#f2ad8f",
  },
  {
    key: "bedroom",
    label: "Dormir",
    backgroundColor: "#ebe8ff",
    floorColor: "#d6d0ff",
    accentColor: "#a79af3",
  },
  {
    key: "garden",
    label: "Jardín",
    backgroundColor: "#e6f8ff",
    floorColor: "#c8efc9",
    accentColor: "#6ec07f",
  },
];

const ACTION_OPTIONS = [
  { action: "alimentar", label: "Alimentar" },
  { action: "jugar", label: "Jugar" },
  { action: "descansar", label: "Descansar" },
  { action: "limpieza", label: "Limpieza" },
];

const QUICK_ACTIONS = [
  ACTION_OPTIONS[0],
  ACTION_OPTIONS[1],
  ACTION_OPTIONS[2],
];

const DEFAULT_STATUS = {
  name: "Pixel",
  level: 3,
  stage: "Cachorro",
  estadoEmocional: "Feliz",
  hambre: 45,
  felicidad: 80,
  energia: 65,
  dailyExp: {
    current: 20,
    max: 100,
  },
};

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

function formatElapsed(start) {
  const elapsed = Math.floor((Date.now() - start) / 1000);
  const hours = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const seconds = String(elapsed % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
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

function AlpacaAvatar({ furColor = "#f8d8b4", bellyColor = "#fdebd6" }) {
  return (
    <View style={styles.alpacaRoot}>
      <View style={styles.alpacaShadow} />
      <View style={[styles.alpacaBody, { backgroundColor: furColor }]}>
        <View style={[styles.alpacaBelly, { backgroundColor: bellyColor }]} />
        <View style={[styles.alpacaFootLeft, { backgroundColor: furColor }]}>
          <View style={styles.alpacaHoof} />
        </View>
        <View style={[styles.alpacaFootRight, { backgroundColor: furColor }]}>
          <View style={styles.alpacaHoof} />
        </View>
      </View>
      <View style={[styles.alpacaHead, { backgroundColor: furColor }]}>
        <View style={[styles.alpacaFace, { backgroundColor: bellyColor }]} />
        <View style={styles.alpacaEyeLeft} />
        <View style={styles.alpacaEyeRight} />
        <View style={styles.alpacaNose} />
        <View style={styles.alpacaMouth} />
        <View style={styles.alpacaCheekLeft} />
        <View style={styles.alpacaCheekRight} />
      </View>
      <View style={[styles.alpacaEarLeft, { backgroundColor: furColor }]}>
        <View style={styles.alpacaEarInner} />
      </View>
      <View style={[styles.alpacaEarRight, { backgroundColor: furColor }]}>
        <View style={styles.alpacaEarInner} />
      </View>
      <View style={[styles.alpacaFurTop, { backgroundColor: furColor }]} />
    </View>
  );
}

function renderSceneDecor(sceneKey) {
  switch (sceneKey) {
    case "livingRoom":
      return (
        <>
          <View style={styles.livingWindowFrame}>
            <View style={styles.livingWindowBackdrop}>
              <View style={styles.livingWindowPane} />
              <View style={[styles.livingWindowPane, styles.livingWindowPaneRight]} />
            </View>
            <View style={styles.livingCurtainLeft} />
            <View style={styles.livingCurtainRight} />
          </View>
          <View style={styles.livingPlant}>
            <View style={styles.livingLeafLeft} />
            <View style={styles.livingLeafRight} />
            <View style={styles.livingPlantPot} />
          </View>
          <View style={styles.livingFrame} />
        </>
      );
    case "bedroom":
      return (
        <>
          <View style={styles.bedroomWindowFrame}>
            <View style={styles.bedroomWindowNight}>
              <View style={styles.bedroomMoon} />
              <View style={[styles.bedroomStar, styles.bedroomStarOne]} />
              <View style={[styles.bedroomStar, styles.bedroomStarTwo]} />
              <View style={[styles.bedroomStar, styles.bedroomStarThree]} />
            </View>
          </View>
          <View style={styles.bedroomBedBase}>
            <View style={styles.bedroomPillow} />
            <View style={styles.bedroomBlanket} />
          </View>
        </>
      );
    case "garden":
    default:
      return (
        <>
          <View style={styles.gardenSun} />
          <View style={styles.gardenHouse}>
            <View style={styles.gardenRoof} />
            <View style={styles.gardenDoor} />
            <View style={styles.gardenWindow} />
          </View>
          <View style={styles.gardenBushLeft} />
          <View style={styles.gardenBushRight} />
        </>
      );
  }
}

export default function App() {
  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [activeSceneKey, setActiveSceneKey] = useState(SCENE_OPTIONS[0].key);
  const [selectedAttribute, setSelectedAttribute] = useState(
    ATTRIBUTE_OPTIONS[0]
  );
  const [attributeMenuVisible, setAttributeMenuVisible] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [timerLabel, setTimerLabel] = useState("00:00:00");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [customNote, setCustomNote] = useState("");
  const [selectedAction, setSelectedAction] = useState(ACTION_OPTIONS[0]);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);

  useEffect(() => {
    const start = Date.now();
    setTimerLabel(formatElapsed(start));
    const interval = setInterval(() => {
      setTimerLabel(formatElapsed(start));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    refreshStatus();
  }, []);

  const attributeDetails = useMemo(
    () => getAttributeDetails(status, selectedAttribute.key),
    [status, selectedAttribute]
  );

  const sceneConfig = useMemo(() => {
    return (
      SCENE_OPTIONS.find((scene) => scene.key === activeSceneKey) ||
      SCENE_OPTIONS[0]
    );
  }, [activeSceneKey]);

  const attributeProgress = useMemo(() => {
    if (typeof attributeDetails.numericValue === "number") {
      return clamp(attributeDetails.numericValue, 0, 100) / 100;
    }
    return null;
  }, [attributeDetails]);

  const attributeProgressPercent = useMemo(() => {
    if (typeof attributeProgress === "number") {
      return Math.round(attributeProgress * 100);
    }
    return null;
  }, [attributeProgress]);

  const dailyExpProgress = useMemo(() => {
    const max = Number(status.dailyExp?.max) || 0;
    if (max <= 0) return 0;
    return clamp(Number(status.dailyExp?.current) || 0, 0, max) / max;
  }, [status.dailyExp]);

  const dailyExpPercent = Math.round(dailyExpProgress * 100);

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
          dailyExp: {
            current: Number(data.dailyExp?.current ?? current.dailyExp.current),
            max: Number(data.dailyExp?.max ?? current.dailyExp.max) || 1,
          },
        }));
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
            dailyExp: {
              current: Number(
                data.status.dailyExp?.current ?? current.dailyExp.current
              ),
              max:
                Number(data.status.dailyExp?.max ?? current.dailyExp.max) || 1,
            },
          }));
        }
        appendLog(data?.message || "La mascota respondió a tu acción.");
      } catch (error) {
        appendLog(
          "Ocurrió un error al enviar la acción. Revisa tu servidor backend."
        );
      }
    },
    [appendLog]
  );

  const handleSubmitCustomAction = useCallback(() => {
    performAction(selectedAction.action, customNote.trim());
    setCustomNote("");
  }, [customNote, performAction, selectedAction]);

  const clearLog = useCallback(() => {
    setLogEntries([]);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.petName}>{status.name || "Tu mascota"}</Text>
            <Text style={styles.petLevel}>
              {`Nivel ${status.level ?? 1}`}
              {status.stage ? ` · ${status.stage}` : ""}
            </Text>
          </View>
          <View style={styles.timerBadge}>
            <Text style={styles.timerLabel}>Sesión</Text>
            <Text style={styles.timerValue}>{timerLabel}</Text>
          </View>
        </View>

        <View style={styles.sceneCard}>
          <View
            style={[
              styles.sceneViewport,
              { backgroundColor: sceneConfig.backgroundColor },
            ]}
          >
            {renderSceneDecor(sceneConfig.key)}
            <View
              style={[
                styles.sceneFloor,
                { backgroundColor: sceneConfig.floorColor },
              ]}
            />
            <AlpacaAvatar />
          </View>
          <View style={styles.sceneTabs}>
            {SCENE_OPTIONS.map((scene) => {
              const isActive = scene.key === sceneConfig.key;
              return (
                <Pressable
                  key={scene.key}
                  style={[
                    styles.sceneTab,
                    isActive && styles.sceneTabActive,
                    isActive && { backgroundColor: scene.accentColor },
                  ]}
                  onPress={() => setActiveSceneKey(scene.key)}
                >
                  <Text
                    style={[
                      styles.sceneTabLabel,
                      isActive && styles.sceneTabLabelActive,
                    ]}
                  >
                    {scene.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.dailyExpContainer}>
            <Text style={styles.sectionTitle}>Progreso diario</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${dailyExpPercent}%` },
                ]}
              />
              <Text style={styles.progressOverlayText}>
                {`${status.dailyExp?.current ?? 0}/${status.dailyExp?.max ?? 0}`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.attributeCard}>
          <Pressable
            onPress={() => setAttributeMenuVisible(true)}
            style={styles.dropdownTrigger}
          >
            <Text style={styles.dropdownLabel}>Atributo</Text>
            <Text style={styles.dropdownValue}>{selectedAttribute.label}</Text>
          </Pressable>
          <View style={styles.attributeDetails}>
            <Text style={styles.attributeTitle}>{attributeDetails.title}</Text>
            <Text style={styles.attributeDescription}>
              {attributeDetails.description}
            </Text>
            {typeof attributeProgressPercent === "number" && (
              <View style={styles.attributeMeter}>
                <View
                  style={[
                    styles.attributeMeterFill,
                    { width: `${attributeProgressPercent}%` },
                  ]}
                />
              </View>
            )}
          </View>
        </View>

        <View style={styles.quickActions}>
          {QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.action}
              style={styles.quickActionButton}
              onPress={() => performAction(action.action)}
            >
              <Text style={styles.quickActionText}>{action.label}</Text>
            </Pressable>
          ))}
          <Pressable
            style={[styles.quickActionButton, styles.refreshButton]}
            onPress={refreshStatus}
            disabled={isRefreshing}
          >
            <Text style={styles.quickActionText}>
              {isRefreshing ? "Actualizando…" : "Actualizar"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Acción personalizada</Text>
          <Pressable
            style={[styles.dropdownTrigger, styles.formDropdown]}
            onPress={() => setActionMenuVisible(true)}
          >
            <Text style={styles.dropdownLabel}>Acción</Text>
            <Text style={styles.dropdownValue}>{selectedAction.label}</Text>
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Añade una nota opcional"
            placeholderTextColor="#9aa0b5"
            value={customNote}
            onChangeText={setCustomNote}
            multiline
          />
          <Pressable style={styles.submitButton} onPress={handleSubmitCustomAction}>
            <Text style={styles.submitButtonText}>Enviar acción</Text>
          </Pressable>
        </View>

        <View style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.sectionTitle}>Registro</Text>
            <Pressable onPress={clearLog}>
              <Text style={styles.clearLogText}>Limpiar</Text>
            </Pressable>
          </View>
          <FlatList
            data={logEntries}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.logItem}>
                <Text style={styles.logTimestamp}>
                  {new Date(item.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text style={styles.logMessage}>{item.message}</Text>
              </View>
            )}
            ListEmptyComponent={() => (
              <Text style={styles.emptyLogText}>
                Todavía no hay eventos en el registro.
              </Text>
            )}
          />
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={attributeMenuVisible}
        onRequestClose={() => setAttributeMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAttributeMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            {ATTRIBUTE_OPTIONS.map((option) => (
              <Pressable
                key={option.key}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedAttribute(option);
                  setAttributeMenuVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={actionMenuVisible}
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActionMenuVisible(false)}
        >
          <View style={styles.modalContent}>
            {ACTION_OPTIONS.map((option) => (
              <Pressable
                key={option.action}
                style={styles.modalOption}
                onPress={() => {
                  setSelectedAction(option);
                  setActionMenuVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f4f5ff",
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 56,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  petName: {
    color: "#2d2357",
    fontSize: 26,
    fontWeight: "700",
  },
  petLevel: {
    color: "#7f79a8",
    marginTop: 4,
  },
  timerBadge: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
    shadowColor: "#b8b6d8",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  timerLabel: {
    color: "#8f8aa8",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timerValue: {
    color: "#2d2357",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
    fontWeight: "600",
  },
  sceneCard: {
    backgroundColor: "#ffffff",
    borderRadius: 32,
    padding: 20,
    marginTop: 24,
    shadowColor: "#d4d2ea",
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 5,
  },
  sceneViewport: {
    height: 260,
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  sceneFloor: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 110,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sceneTabs: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sceneTab: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 16,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ede9ff",
  },
  sceneTabActive: {
    shadowColor: "#c9c0f4",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 3,
  },
  sceneTabLabel: {
    color: "#675f94",
    fontWeight: "600",
  },
  sceneTabLabelActive: {
    color: "#ffffff",
  },
  dailyExpContainer: {
    width: "100%",
    marginTop: 20,
  },
  sectionTitle: {
    color: "#2d2357",
    fontSize: 18,
    fontWeight: "600",
  },
  progressBar: {
    backgroundColor: "#ede9ff",
    borderRadius: 16,
    overflow: "hidden",
    height: 36,
    justifyContent: "center",
    marginTop: 12,
  },
  progressFill: {
    backgroundColor: "#7ed6c4",
    height: "100%",
  },
  progressOverlayText: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#2d2357",
    fontWeight: "700",
    lineHeight: 36,
  },
  attributeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    marginTop: 24,
    shadowColor: "#d4d2ea",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
  },
  dropdownTrigger: {
    backgroundColor: "#f3f1ff",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#ded9ff",
  },
  dropdownLabel: {
    color: "#8f8aa8",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dropdownValue: {
    color: "#2d2357",
    fontSize: 16,
    marginTop: 4,
    fontWeight: "600",
  },
  formDropdown: {
    marginTop: 16,
  },
  attributeDetails: {
    marginTop: 20,
  },
  attributeTitle: {
    color: "#2d2357",
    fontSize: 18,
    fontWeight: "600",
  },
  attributeDescription: {
    color: "#6f6a8a",
    lineHeight: 20,
    marginTop: 8,
  },
  attributeMeter: {
    backgroundColor: "#ede9ff",
    borderRadius: 999,
    overflow: "hidden",
    height: 12,
    marginTop: 12,
  },
  attributeMeterFill: {
    backgroundColor: "#a79af3",
    height: "100%",
  },
  quickActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 24,
  },
  quickActionButton: {
    flexGrow: 1,
    flexBasis: "48%",
    backgroundColor: "#ede9ff",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ded9ff",
  },
  refreshButton: {
    backgroundColor: "#dff4ff",
    borderColor: "#c5e7ff",
  },
  quickActionText: {
    color: "#2d2357",
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    marginTop: 24,
    shadowColor: "#d4d2ea",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
  },
  input: {
    minHeight: 80,
    borderRadius: 18,
    backgroundColor: "#f3f1ff",
    padding: 16,
    color: "#2d2357",
    textAlignVertical: "top",
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#ded9ff",
  },
  submitButton: {
    backgroundColor: "#7e74f1",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 24,
    marginTop: 24,
    marginBottom: 44,
    shadowColor: "#d4d2ea",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 4,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  clearLogText: {
    color: "#7e74f1",
    fontWeight: "600",
  },
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e3e0ff",
    paddingVertical: 12,
  },
  logTimestamp: {
    color: "#8f8aa8",
    fontSize: 12,
    marginBottom: 4,
  },
  logMessage: {
    color: "#2d2357",
    lineHeight: 20,
  },
  emptyLogText: {
    color: "#8f8aa8",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(45, 35, 87, 0.28)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 8,
    shadowColor: "#d4d2ea",
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 6,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e8e5ff",
  },
  modalOptionText: {
    color: "#2d2357",
    fontSize: 16,
    fontWeight: "500",
  },
  alpacaRoot: {
    width: 170,
    height: 200,
    alignItems: "center",
    justifyContent: "flex-end",
    position: "absolute",
    bottom: 36,
  },
  alpacaShadow: {
    position: "absolute",
    bottom: 18,
    width: 120,
    height: 26,
    backgroundColor: "rgba(0,0,0,0.08)",
    borderRadius: 13,
  },
  alpacaBody: {
    position: "absolute",
    bottom: 42,
    width: 120,
    height: 110,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  alpacaBelly: {
    width: 86,
    height: 86,
    borderRadius: 43,
    position: "absolute",
    bottom: 18,
  },
  alpacaFootLeft: {
    position: "absolute",
    bottom: -6,
    left: 24,
    width: 32,
    height: 38,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  alpacaFootRight: {
    position: "absolute",
    bottom: -6,
    right: 24,
    width: 32,
    height: 38,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  alpacaHoof: {
    width: 26,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#d2b59b",
    marginBottom: 2,
  },
  alpacaHead: {
    position: "absolute",
    bottom: 120,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  alpacaFace: {
    position: "absolute",
    bottom: 24,
    width: 82,
    height: 74,
    borderRadius: 38,
  },
  alpacaEyeLeft: {
    position: "absolute",
    top: 56,
    left: 36,
    width: 12,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3b2f2f",
  },
  alpacaEyeRight: {
    position: "absolute",
    top: 56,
    right: 36,
    width: 12,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#3b2f2f",
  },
  alpacaNose: {
    position: "absolute",
    top: 76,
    width: 22,
    height: 16,
    borderRadius: 10,
    backgroundColor: "#3b2f2f",
  },
  alpacaMouth: {
    position: "absolute",
    top: 92,
    width: 34,
    height: 18,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#3b2f2f",
    borderTopColor: "transparent",
    backgroundColor: "transparent",
  },
  alpacaCheekLeft: {
    position: "absolute",
    top: 86,
    left: 26,
    width: 18,
    height: 12,
    borderRadius: 9,
    backgroundColor: "#f6a6b2",
  },
  alpacaCheekRight: {
    position: "absolute",
    top: 86,
    right: 26,
    width: 18,
    height: 12,
    borderRadius: 9,
    backgroundColor: "#f6a6b2",
  },
  alpacaEarLeft: {
    position: "absolute",
    top: 6,
    left: 42,
    width: 32,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-6deg" }],
  },
  alpacaEarRight: {
    position: "absolute",
    top: 8,
    right: 42,
    width: 32,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "6deg" }],
  },
  alpacaEarInner: {
    width: 18,
    height: 26,
    borderRadius: 12,
    backgroundColor: "#f8cdd5",
  },
  alpacaFurTop: {
    position: "absolute",
    top: 40,
    width: 88,
    height: 36,
    borderRadius: 18,
  },
  livingWindowFrame: {
    position: "absolute",
    top: 28,
    left: 36,
    right: 36,
    height: 128,
    borderRadius: 24,
    backgroundColor: "#fff2d6",
    padding: 12,
    justifyContent: "center",
  },
  livingWindowBackdrop: {
    flexDirection: "row",
    width: "100%",
    height: "100%",
    backgroundColor: "#c3e6ff",
    borderRadius: 20,
    overflow: "hidden",
  },
  livingWindowPane: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: "#a8dbff",
  },
  livingWindowPaneRight: {
    backgroundColor: "#9fd3f5",
  },
  livingCurtainLeft: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 8,
    width: 28,
    backgroundColor: "#f7c2dd",
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  livingCurtainRight: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 8,
    width: 28,
    backgroundColor: "#f7c2dd",
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
  },
  livingPlant: {
    position: "absolute",
    bottom: 36,
    left: 30,
    width: 64,
    height: 90,
  },
  livingLeafLeft: {
    position: "absolute",
    top: 0,
    left: 4,
    width: 28,
    height: 48,
    borderRadius: 20,
    backgroundColor: "#8bd3a5",
    transform: [{ rotate: "-16deg" }],
  },
  livingLeafRight: {
    position: "absolute",
    top: 8,
    right: 4,
    width: 28,
    height: 50,
    borderRadius: 20,
    backgroundColor: "#5fbf8d",
    transform: [{ rotate: "12deg" }],
  },
  livingPlantPot: {
    position: "absolute",
    bottom: 0,
    left: 10,
    right: 10,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#f0b78d",
  },
  livingFrame: {
    position: "absolute",
    top: 52,
    right: 36,
    width: 58,
    height: 48,
    borderRadius: 12,
    borderWidth: 4,
    borderColor: "#f2b07e",
    backgroundColor: "#ffeec9",
  },
  bedroomWindowFrame: {
    position: "absolute",
    top: 28,
    left: 70,
    right: 70,
    height: 126,
    borderRadius: 28,
    backgroundColor: "#dcd9ff",
    padding: 12,
  },
  bedroomWindowNight: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#757ee5",
    position: "relative",
    overflow: "hidden",
  },
  bedroomMoon: {
    position: "absolute",
    top: 30,
    left: 38,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff5c1",
  },
  bedroomStar: {
    position: "absolute",
    width: 12,
    height: 12,
    backgroundColor: "#fff5c1",
    transform: [{ rotate: "45deg" }],
    borderRadius: 2,
  },
  bedroomStarOne: {
    top: 28,
    right: 28,
  },
  bedroomStarTwo: {
    top: 60,
    left: 28,
  },
  bedroomStarThree: {
    bottom: 24,
    right: 54,
  },
  bedroomBedBase: {
    position: "absolute",
    bottom: 52,
    right: 28,
    width: 150,
    height: 72,
    borderRadius: 26,
    backgroundColor: "#fdf1f4",
  },
  bedroomPillow: {
    position: "absolute",
    top: 14,
    left: 18,
    width: 64,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#ffffff",
  },
  bedroomBlanket: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#bcb2ff",
  },
  gardenSun: {
    position: "absolute",
    top: 32,
    right: 48,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffe18d",
  },
  gardenHouse: {
    position: "absolute",
    bottom: 70,
    left: 64,
    width: 170,
    height: 120,
    borderRadius: 26,
    backgroundColor: "#fff2d6",
    alignItems: "center",
  },
  gardenRoof: {
    position: "absolute",
    top: -40,
    width: 200,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f5b7b1",
    left: -15,
  },
  gardenDoor: {
    position: "absolute",
    bottom: 0,
    width: 46,
    height: 66,
    borderRadius: 16,
    backgroundColor: "#d39c7b",
    left: 62,
  },
  gardenWindow: {
    position: "absolute",
    top: 32,
    width: 54,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#bde7ff",
    left: 58,
  },
  gardenBushLeft: {
    position: "absolute",
    bottom: 56,
    left: 28,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#8fd29e",
  },
  gardenBushRight: {
    position: "absolute",
    bottom: 56,
    right: 28,
    width: 90,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#7cc88d",
  },
});
