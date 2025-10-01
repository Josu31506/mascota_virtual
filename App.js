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

export default function App() {
  const [status, setStatus] = useState(DEFAULT_STATUS);
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
      <StatusBar style="light" />
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
          <View style={styles.petAvatar}>
            <Text style={styles.petEmoji}>🐾</Text>
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
    backgroundColor: "#121629",
  },
  scrollContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  petName: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  petLevel: {
    color: "#b2b9d6",
    marginTop: 4,
  },
  timerBadge: {
    backgroundColor: "#1f2547",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  timerLabel: {
    color: "#8a90ad",
    fontSize: 12,
  },
  timerValue: {
    color: "#ffffff",
    fontSize: 16,
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },
  sceneCard: {
    backgroundColor: "#1b203b",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    marginTop: 24,
  },
  petAvatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#2c3155",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  petEmoji: {
    fontSize: 72,
  },
  dailyExpContainer: {
    width: "100%",
    marginTop: 24,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
  },
  progressBar: {
    backgroundColor: "#2c3258",
    borderRadius: 12,
    overflow: "hidden",
    height: 36,
    justifyContent: "center",
    marginTop: 12,
  },
  progressFill: {
    backgroundColor: "#54d4a0",
    height: "100%",
  },
  progressOverlayText: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "#ffffff",
    fontWeight: "700",
    lineHeight: 36,
  },
  attributeCard: {
    backgroundColor: "#1b203b",
    borderRadius: 24,
    padding: 20,
    marginTop: 24,
  },
  dropdownTrigger: {
    backgroundColor: "#262c4f",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownLabel: {
    color: "#8a90ad",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dropdownValue: {
    color: "#ffffff",
    fontSize: 16,
    marginTop: 4,
    fontWeight: "600",
  },
  formDropdown: {
    marginTop: 16,
  },
  attributeTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  attributeDescription: {
    color: "#c4c9e6",
    lineHeight: 20,
    marginTop: 8,
  },
  attributeMeter: {
    backgroundColor: "#2c3258",
    borderRadius: 999,
    overflow: "hidden",
    height: 12,
    marginTop: 8,
  },
  attributeMeterFill: {
    backgroundColor: "#7b5bff",
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
    backgroundColor: "#2a3060",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  refreshButton: {
    backgroundColor: "#3d467d",
  },
  quickActionText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "#1b203b",
    borderRadius: 24,
    padding: 20,
    marginTop: 24,
  },
  input: {
    minHeight: 80,
    borderRadius: 16,
    backgroundColor: "#262c4f",
    padding: 16,
    color: "#ffffff",
    textAlignVertical: "top",
    marginTop: 16,
  },
  submitButton: {
    backgroundColor: "#54d4a0",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  submitButtonText: {
    color: "#0d1b2a",
    fontWeight: "700",
    fontSize: 16,
  },
  logCard: {
    backgroundColor: "#1b203b",
    borderRadius: 24,
    padding: 20,
    marginTop: 24,
    marginBottom: 40,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  clearLogText: {
    color: "#8a90ad",
    fontWeight: "600",
  },
  logItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#2c3258",
    paddingVertical: 12,
  },
  logTimestamp: {
    color: "#8a90ad",
    fontSize: 12,
    marginBottom: 4,
  },
  logMessage: {
    color: "#ffffff",
    lineHeight: 20,
  },
  emptyLogText: {
    color: "#8a90ad",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(9, 13, 34, 0.7)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#1f2547",
    borderRadius: 24,
    paddingVertical: 8,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    color: "#ffffff",
    fontSize: 16,
  },
});
