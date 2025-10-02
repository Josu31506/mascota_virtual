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
const resolvedBaseUrl =
  envBaseUrl || Constants?.expoConfig?.extra?.apiBaseUrl || "http://localhost:4004";
const DEFAULT_API_BASE_URL =
  typeof resolvedBaseUrl === "string"
    ? resolvedBaseUrl.replace(/\/$/, "")
    : "http://localhost:4004";

const ATTRIBUTE_OPTIONS = [
  { key: "estadoEmocional", label: "Estado emocional" },
  { key: "hambre", label: "Hambre" },
  { key: "felicidad", label: "Felicidad" },
  { key: "energia", label: "Energía" },
];

const ACTION_OPTIONS = [
  { action: "feed", label: "Alimentar" },
  { action: "care", label: "Acariciar" },
  { action: "refresh", label: "Actualizar estado" },
];

const QUICK_ACTIONS = ACTION_OPTIONS;

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

function ensureNumber(value) {
  const trimmed = `${value ?? ""}`.trim();
  if (trimmed.length === 0) {
    return { ok: false };
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

function ensureOptionalNumber(value) {
  if (typeof value !== "string") {
    return { ok: true, value: undefined };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { ok: true, value: undefined };
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return { ok: false };
  }
  return { ok: true, value: parsed };
}

export default function App() {
  const [configuredBaseUrl, setConfiguredBaseUrl] = useState(DEFAULT_API_BASE_URL);
  const [baseUrlInput, setBaseUrlInput] = useState(DEFAULT_API_BASE_URL);
  const normalizedBaseUrl = useMemo(() => {
    if (typeof configuredBaseUrl !== "string" || configuredBaseUrl.length === 0) {
      return DEFAULT_API_BASE_URL;
    }
    return configuredBaseUrl.replace(/\/$/, "");
  }, [configuredBaseUrl]);
  const [lastApiResponse, setLastApiResponse] = useState("");
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [storeOpen, setStoreOpen] = useState(false);
  const [storeAnimating, setStoreAnimating] = useState(false);
  const storeProgress = useRef(new Animated.Value(0)).current;
  const [authCredentials, setAuthCredentials] = useState({
    nombre: "",
    email: "",
    password: "",
    rol: "",
  });
  const [authProfileForm, setAuthProfileForm] = useState({ nombre: "", email: "" });
  const [profileForm, setProfileForm] = useState({
    imagenPerfil: "",
    nombreUsuario: "",
    descripcion: "",
  });
  const [feedItemId, setFeedItemId] = useState("1");
  const [inventoryForm, setInventoryForm] = useState({ itemId: "", cantidad: "" });
  const [inventoryUseItemId, setInventoryUseItemId] = useState("");
  const [communityPostForm, setCommunityPostForm] = useState({
    contenido: "",
    tipoUsuario: "usuario",
  });
  const [communityTargetId, setCommunityTargetId] = useState("");
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    type: "task",
    frequency: "one-time",
    category: "",
    duration: "",
  });
  const [taskIdInput, setTaskIdInput] = useState("");
  const [taskQuery, setTaskQuery] = useState("");
  const [storeItemForm, setStoreItemForm] = useState({
    itemId: "",
    nombre: "",
    tipo: "",
    descripcion: "",
    precio: "",
    cantidad: "",
    imagen: "",
  });
  const [storeDeleteItemId, setStoreDeleteItemId] = useState("");
  const [storePurchaseForm, setStorePurchaseForm] = useState({ itemId: "", cantidad: "" });
  const [coinOfferForm, setCoinOfferForm] = useState({
    offerId: "",
    nombre: "",
    precioReal: "",
    monedasObtenidas: "",
  });
  const [coinOfferId, setCoinOfferId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [chatForm, setChatForm] = useState({
    receiverId: "",
    message: "",
    messageType: "text",
  });
  const [chatHistoryReceiverId, setChatHistoryReceiverId] = useState("");
  const [chatReadMessageId, setChatReadMessageId] = useState("");
  const [chatReadPayload, setChatReadPayload] = useState({
    receiverId: "",
    message: "",
    messageType: "text",
  });
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
    setBaseUrlInput(configuredBaseUrl);
  }, [configuredBaseUrl]);

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

  const callApi = useCallback(
    async ({
      path,
      method = "GET",
      body,
      successMessage,
      onSuccess,
      requestDescription,
    }) => {
      const sanitizedPath = path.startsWith("/") ? path : `/${path}`;
      const url = `${normalizedBaseUrl}${sanitizedPath}`;
      const verb = method.toUpperCase();
      const description = requestDescription || `${verb} ${sanitizedPath}`;
      appendLog(`Solicitando ${description}`);
      try {
        const headers = { Accept: "application/json" };
        const hasBody = typeof body !== "undefined" && body !== null;
        const payload = hasBody ? JSON.stringify(body) : undefined;
        if (hasBody) {
          headers["Content-Type"] = "application/json";
        }
        const response = await fetch(url, {
          method: verb,
          headers,
          body: payload,
          credentials: "include",
        });
        const contentType = response.headers.get("content-type") || "";
        let parsed;
        if (contentType.includes("application/json")) {
          parsed = await response.json();
        } else {
          const text = await response.text();
          parsed = text ? { raw: text } : null;
        }
        if (!response.ok) {
          const errorMessage =
            (parsed && typeof parsed === "object" && parsed.message) ||
            `${response.status} ${response.statusText}`;
          throw new Error(errorMessage);
        }
        if (typeof onSuccess === "function") {
          onSuccess(parsed);
        }
        const shouldLogSuccess = successMessage !== false;
        if (shouldLogSuccess) {
          if (typeof successMessage === "string" && successMessage.length > 0) {
            appendLog(successMessage);
          } else {
            appendLog(`Éxito: ${verb} ${sanitizedPath}`);
          }
        }
        if (parsed !== null && typeof parsed !== "undefined") {
          setLastApiResponse(JSON.stringify(parsed, null, 2));
        } else {
          setLastApiResponse("(sin contenido)");
        }
        return parsed;
      } catch (error) {
        appendLog(`Error en ${verb} ${sanitizedPath}: ${error.message}`);
        setLastApiResponse(error.message);
        throw error;
      }
    },
    [appendLog, normalizedBaseUrl]
  );

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await callApi({
        path: "/pet/status",
        method: "GET",
        successMessage: false,
        onSuccess: (data) => {
          const statusPayload =
            data && typeof data === "object" && data.status && typeof data.status === "object"
              ? data.status
              : data;
          if (statusPayload && typeof statusPayload === "object") {
            setStatus((current) => ({
              ...current,
              ...statusPayload,
            }));
            setLastUpdatedAt(Date.now());
          }
          const message =
            data && typeof data === "object" && data.message
              ? data.message
              : "Estado actualizado correctamente.";
          appendLog(message);
        },
      });
    } catch (error) {
      // El error ya fue registrado por callApi.
    } finally {
      setIsRefreshing(false);
    }
  }, [appendLog, callApi]);

  const feedPet = useCallback(async () => {
    const trimmed = feedItemId.trim();
    if (trimmed.length === 0) {
      appendLog("Ingresa un itemId para alimentar a la mascota.");
      return;
    }
    const parsedId = Number(trimmed);
    if (Number.isNaN(parsedId)) {
      appendLog("El itemId debe ser un número válido.");
      return;
    }
    try {
      await callApi({
        path: "/pet/feed",
        method: "POST",
        body: { itemId: parsedId },
        successMessage: false,
        requestDescription: "alimentar mascota",
        onSuccess: (data) => {
          const statusPayload =
            data && typeof data === "object" && data.status && typeof data.status === "object"
              ? data.status
              : data;
          if (statusPayload && typeof statusPayload === "object") {
            setStatus((current) => ({
              ...current,
              ...statusPayload,
            }));
            setLastUpdatedAt(Date.now());
          }
          const message =
            data && typeof data === "object" && data.message
              ? data.message
              : "La mascota ha sido alimentada.";
          appendLog(message);
        },
      });
    } catch (error) {
      // El error ya fue registrado por callApi.
    }
  }, [appendLog, callApi, feedItemId]);

  const carePet = useCallback(async () => {
    try {
      await callApi({
        path: "/pet/care",
        method: "POST",
        successMessage: false,
        requestDescription: "acariciar mascota",
        onSuccess: (data) => {
          const statusPayload =
            data && typeof data === "object" && data.status && typeof data.status === "object"
              ? data.status
              : data;
          if (statusPayload && typeof statusPayload === "object") {
            setStatus((current) => ({
              ...current,
              ...statusPayload,
            }));
            setLastUpdatedAt(Date.now());
          }
          const message =
            data && typeof data === "object" && data.message
              ? data.message
              : "La mascota se siente más querida.";
          appendLog(message);
        },
      });
    } catch (error) {
      // El error ya fue registrado por callApi.
    }
  }, [appendLog, callApi]);

  const performAction = useCallback(
    async (action) => {
      switch (action) {
        case "feed":
          await feedPet();
          break;
        case "care":
          await carePet();
          break;
        case "refresh":
          await refreshStatus();
          break;
        default:
          appendLog(`Acción ${action} no está integrada con el backend.`);
      }
    },
    [appendLog, carePet, feedPet, refreshStatus]
  );

  const handleSubmitCustomAction = useCallback(async () => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await performAction(selectedActionKey);
    } catch (error) {
      // El error ya fue registrado en el log por performAction.
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, performAction, selectedActionKey]);

  const handleQuickAction = useCallback(
    (action) => {
      performAction(action).catch(() => {
        // El error ya fue registrado en el log dentro de performAction.
      });
    },
    [performAction]
  );

  const applyBaseUrl = useCallback(() => {
    const trimmed = baseUrlInput.trim();
    if (trimmed.length === 0) {
      appendLog("Ingresa una URL base válida.");
      return;
    }
    const sanitized = trimmed.replace(/\/$/, "");
    setConfiguredBaseUrl(sanitized);
    appendLog(`URL base actualizada a ${sanitized}`);
  }, [appendLog, baseUrlInput]);

  const handleRegister = useCallback(async () => {
    const { nombre, email, password, rol } = authCredentials;
    if (!nombre.trim() || !email.trim() || !password.trim()) {
      appendLog("Completa nombre, correo y contraseña para registrar un usuario.");
      return;
    }
    const payload = {
      nombre: nombre.trim(),
      email: email.trim(),
      password: password.trim(),
    };
    if (rol.trim()) {
      payload.rol = rol.trim();
    }
    try {
      await callApi({
        path: "/auth/register",
        method: "POST",
        body: payload,
        requestDescription: "registro de usuario",
        successMessage: "Registro realizado correctamente.",
      });
    } catch (error) {
      // El error ya fue registrado por callApi.
    }
  }, [appendLog, authCredentials, callApi]);

  const handleLogin = useCallback(async () => {
    const { email, password } = authCredentials;
    if (!email.trim() || !password.trim()) {
      appendLog("Ingresa correo y contraseña para iniciar sesión.");
      return;
    }
    try {
      await callApi({
        path: "/auth/login",
        method: "POST",
        body: {
          email: email.trim(),
          password: password.trim(),
        },
        requestDescription: "inicio de sesión",
        successMessage: "Inicio de sesión exitoso.",
      });
    } catch (error) {
      // El error ya fue registrado por callApi.
    }
  }, [appendLog, authCredentials, callApi]);

  const handleLogout = useCallback(async () => {
    try {
      await callApi({
        path: "/auth/logout",
        method: "POST",
        requestDescription: "cierre de sesión",
        successMessage: "Sesión cerrada correctamente.",
      });
    } catch (error) {
      // El error ya fue registrado por callApi.
    }
  }, [callApi]);

  const handleAuthProfileUpdate = useCallback(async () => {
    const payload = {};
    if (authProfileForm.nombre.trim()) {
      payload.nombre = authProfileForm.nombre.trim();
    }
    if (authProfileForm.email.trim()) {
      payload.email = authProfileForm.email.trim();
    }
    if (Object.keys(payload).length === 0) {
      appendLog("Indica nombre y/o correo para actualizar el perfil de autenticación.");
      return;
    }
    try {
      await callApi({
        path: "/auth/profile",
        method: "PUT",
        body: payload,
        requestDescription: "actualización de perfil de autenticación",
        successMessage: "Perfil actualizado correctamente.",
      });
    } catch (error) {
      // El error ya fue registrado.
    }
  }, [appendLog, authProfileForm, callApi]);

  const handleProfileUpdate = useCallback(async () => {
    const payload = {};
    if (profileForm.imagenPerfil.trim()) {
      payload.imagenPerfil = profileForm.imagenPerfil.trim();
    }
    if (profileForm.nombreUsuario.trim()) {
      payload.nombreUsuario = profileForm.nombreUsuario.trim();
    }
    if (profileForm.descripcion.trim()) {
      payload.descripcion = profileForm.descripcion.trim();
    }
    if (Object.keys(payload).length === 0) {
      appendLog("Completa al menos un campo para actualizar el perfil público.");
      return;
    }
    try {
      await callApi({
        path: "/profile",
        method: "PUT",
        body: payload,
        requestDescription: "actualización de perfil público",
        successMessage: "Perfil público actualizado.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, profileForm]);

  const handleGetProfile = useCallback(async () => {
    try {
      await callApi({
        path: "/profile",
        method: "GET",
        requestDescription: "consulta de perfil",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleGetProfileInventory = useCallback(async () => {
    try {
      await callApi({
        path: "/profile/perfiles-inventario",
        method: "GET",
        requestDescription: "inventario de imágenes de perfil",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleGetAccessories = useCallback(async () => {
    try {
      await callApi({
        path: "/pet/accessories",
        method: "GET",
        requestDescription: "accesorios desbloqueados",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleGetFoodAmount = useCallback(async () => {
    try {
      await callApi({
        path: "/pet/food-amount",
        method: "GET",
        requestDescription: "cantidad de alimentos disponibles",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleGetInventory = useCallback(async () => {
    try {
      await callApi({
        path: "/inventory",
        method: "GET",
        requestDescription: "inventario del usuario",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleAddInventoryItem = useCallback(async () => {
    const itemIdResult = ensureNumber(inventoryForm.itemId);
    const quantityResult = ensureNumber(inventoryForm.cantidad);
    if (!itemIdResult.ok || !quantityResult.ok) {
      appendLog("Para agregar un ítem indica itemId y cantidad válidos.");
      return;
    }
    try {
      await callApi({
        path: "/inventory/add",
        method: "POST",
        body: {
          itemId: itemIdResult.value,
          cantidad: quantityResult.value,
        },
        requestDescription: "agregar ítem a inventario",
        successMessage: "Ítem agregado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, inventoryForm]);

  const handleUseInventoryItem = useCallback(async () => {
    const itemIdResult = ensureNumber(inventoryUseItemId);
    if (!itemIdResult.ok) {
      appendLog("Indica un itemId válido para usar un ítem del inventario.");
      return;
    }
    try {
      await callApi({
        path: "/inventory/use",
        method: "POST",
        body: { itemId: itemIdResult.value },
        requestDescription: "usar ítem de inventario",
        successMessage: "Ítem utilizado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, inventoryUseItemId]);

  const handleCreatePost = useCallback(async () => {
    if (!communityPostForm.contenido.trim()) {
      appendLog("Escribe contenido para crear un post en la comunidad.");
      return;
    }
    try {
      await callApi({
        path: "/community",
        method: "POST",
        body: {
          contenido: communityPostForm.contenido.trim(),
          tipoUsuario: communityPostForm.tipoUsuario.trim() || "usuario",
        },
        requestDescription: "crear post en comunidad",
        successMessage: "Post creado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, communityPostForm]);

  const handleGetPosts = useCallback(async () => {
    try {
      await callApi({
        path: "/community",
        method: "GET",
        requestDescription: "obtener posts de la comunidad",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleLikePost = useCallback(async () => {
    const result = ensureNumber(communityTargetId);
    if (!result.ok) {
      appendLog("Indica el ID del post para dar like.");
      return;
    }
    try {
      await callApi({
        path: `/community/${result.value}/like`,
        method: "POST",
        requestDescription: "dar like a post",
        successMessage: "Like registrado.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, communityTargetId]);

  const handleDeletePost = useCallback(async () => {
    const result = ensureNumber(communityTargetId);
    if (!result.ok) {
      appendLog("Indica el ID del post que deseas eliminar.");
      return;
    }
    try {
      await callApi({
        path: `/community/${result.value}`,
        method: "DELETE",
        requestDescription: "eliminar post",
        successMessage: "Post eliminado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, communityTargetId]);

  const handleCreateTask = useCallback(async () => {
    if (!taskForm.title.trim()) {
      appendLog("Indica un título para crear la tarea.");
      return;
    }
    const durationResult = ensureOptionalNumber(taskForm.duration);
    if (!durationResult.ok) {
      appendLog("La duración de la tarea debe ser un número válido.");
      return;
    }
    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      dueDate: taskForm.dueDate.trim() || new Date().toISOString(),
      type: taskForm.type.trim() || "task",
      frequency: taskForm.frequency.trim() || "one-time",
    };
    if (taskForm.category.trim()) {
      payload.category = taskForm.category.trim();
    }
    if (typeof durationResult.value !== "undefined") {
      payload.duration = durationResult.value;
    }
    try {
      await callApi({
        path: "/tasks",
        method: "POST",
        body: payload,
        requestDescription: "crear tarea",
        successMessage: "Tarea creada correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, taskForm]);

  const handleUpdateTask = useCallback(async () => {
    const taskIdResult = ensureNumber(taskIdInput);
    if (!taskIdResult.ok) {
      appendLog("Indica el ID de la tarea a actualizar.");
      return;
    }
    const payload = { taskId: taskIdResult.value };
    if (taskForm.title.trim()) {
      payload.title = taskForm.title.trim();
    }
    if (taskForm.category.trim()) {
      payload.category = taskForm.category.trim();
    }
    if (taskForm.description.trim()) {
      payload.description = taskForm.description.trim();
    }
    if (taskForm.dueDate.trim()) {
      payload.dueDate = taskForm.dueDate.trim();
    }
    const durationResult = ensureOptionalNumber(taskForm.duration);
    if (!durationResult.ok) {
      appendLog("La duración debe ser un número válido.");
      return;
    }
    if (typeof durationResult.value !== "undefined") {
      payload.duration = durationResult.value;
    }
    if (taskForm.type.trim()) {
      payload.type = taskForm.type.trim();
    }
    if (taskForm.frequency.trim()) {
      payload.frequency = taskForm.frequency.trim();
    }
    try {
      await callApi({
        path: "/tasks",
        method: "PUT",
        body: payload,
        requestDescription: "actualizar tarea",
        successMessage: "Tarea actualizada correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, taskForm, taskIdInput]);

  const handleGetTasks = useCallback(async () => {
    const trimmedQuery = taskQuery.trim();
    const path = trimmedQuery.length > 0 ? `/tasks?${trimmedQuery}` : "/tasks";
    try {
      await callApi({
        path,
        method: "GET",
        requestDescription: "consulta de tareas",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi, taskQuery]);

  const handleDeleteTask = useCallback(async () => {
    const taskIdResult = ensureNumber(taskIdInput);
    if (!taskIdResult.ok) {
      appendLog("Indica el ID de la tarea a eliminar.");
      return;
    }
    try {
      await callApi({
        path: `/tasks/${taskIdResult.value}`,
        method: "DELETE",
        requestDescription: "eliminar tarea",
        successMessage: "Tarea eliminada correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, taskIdInput]);

  const handleCompleteTask = useCallback(async () => {
    const taskIdResult = ensureNumber(taskIdInput);
    if (!taskIdResult.ok) {
      appendLog("Indica el ID de la tarea a completar.");
      return;
    }
    try {
      await callApi({
        path: `/tasks/complete/${taskIdResult.value}`,
        method: "PUT",
        requestDescription: "marcar tarea como completada",
        successMessage: "Tarea marcada como completada.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, taskIdInput]);

  const handleCreateStoreItem = useCallback(async () => {
    if (
      !storeItemForm.nombre.trim() ||
      !storeItemForm.tipo.trim() ||
      !storeItemForm.descripcion.trim() ||
      !storeItemForm.precio.trim() ||
      !storeItemForm.cantidad.trim() ||
      !storeItemForm.imagen.trim()
    ) {
      appendLog("Completa todos los campos para crear un producto en la tienda.");
      return;
    }
    const priceResult = ensureNumber(storeItemForm.precio);
    const quantityResult = ensureNumber(storeItemForm.cantidad);
    if (!priceResult.ok || !quantityResult.ok) {
      appendLog("Precio y cantidad deben ser números válidos.");
      return;
    }
    try {
      await callApi({
        path: "/store/create-item",
        method: "POST",
        body: {
          nombre: storeItemForm.nombre.trim(),
          tipo: storeItemForm.tipo.trim(),
          descripcion: storeItemForm.descripcion.trim(),
          precio: priceResult.value,
          cantidad: quantityResult.value,
          imagen: storeItemForm.imagen.trim(),
        },
        requestDescription: "crear producto en tienda",
        successMessage: "Producto creado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, storeItemForm]);

  const handleUpdateStoreItem = useCallback(async () => {
    const itemIdResult = ensureNumber(storeItemForm.itemId);
    if (!itemIdResult.ok) {
      appendLog("Indica el ID del producto a actualizar.");
      return;
    }
    const payload = { itemId: itemIdResult.value };
    if (storeItemForm.nombre.trim()) {
      payload.nombre = storeItemForm.nombre.trim();
    }
    if (storeItemForm.tipo.trim()) {
      payload.tipo = storeItemForm.tipo.trim();
    }
    if (storeItemForm.descripcion.trim()) {
      payload.descripcion = storeItemForm.descripcion.trim();
    }
    const priceResult = ensureOptionalNumber(storeItemForm.precio);
    if (!priceResult.ok) {
      appendLog("El precio debe ser un número válido.");
      return;
    }
    if (typeof priceResult.value !== "undefined") {
      payload.precio = priceResult.value;
    }
    const quantityResult = ensureOptionalNumber(storeItemForm.cantidad);
    if (!quantityResult.ok) {
      appendLog("La cantidad debe ser un número válido.");
      return;
    }
    if (typeof quantityResult.value !== "undefined") {
      payload.cantidad = quantityResult.value;
    }
    if (storeItemForm.imagen.trim()) {
      payload.imagen = storeItemForm.imagen.trim();
    }
    try {
      await callApi({
        path: "/store/update-item",
        method: "PUT",
        body: payload,
        requestDescription: "actualizar producto en tienda",
        successMessage: "Producto actualizado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, storeItemForm]);

  const handleGetStoreItems = useCallback(async () => {
    try {
      await callApi({
        path: "/store/items",
        method: "GET",
        requestDescription: "obtener productos de tienda",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleDeleteStoreItem = useCallback(async () => {
    const result = ensureNumber(storeDeleteItemId);
    if (!result.ok) {
      appendLog("Indica el ID del producto a eliminar.");
      return;
    }
    try {
      await callApi({
        path: `/store/delete-item/${result.value}`,
        method: "DELETE",
        requestDescription: "eliminar producto de tienda",
        successMessage: "Producto eliminado correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, storeDeleteItemId]);

  const handleBuyItem = useCallback(async () => {
    const itemIdResult = ensureNumber(storePurchaseForm.itemId);
    const quantityResult = ensureNumber(storePurchaseForm.cantidad);
    if (!itemIdResult.ok || !quantityResult.ok) {
      appendLog("Indica itemId y cantidad válidos para comprar en la tienda.");
      return;
    }
    try {
      await callApi({
        path: "/store/buy-item",
        method: "POST",
        body: {
          itemId: itemIdResult.value,
          cantidad: quantityResult.value,
        },
        requestDescription: "compra de producto",
        successMessage: "Compra de producto registrada.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, storePurchaseForm]);

  const handleCreateCoinOffer = useCallback(async () => {
    if (
      !coinOfferForm.nombre.trim() ||
      !coinOfferForm.precioReal.trim() ||
      !coinOfferForm.monedasObtenidas.trim()
    ) {
      appendLog("Completa nombre, precio real y monedas obtenidas para crear una oferta.");
      return;
    }
    const priceResult = ensureNumber(coinOfferForm.precioReal);
    const coinsResult = ensureNumber(coinOfferForm.monedasObtenidas);
    if (!priceResult.ok || !coinsResult.ok) {
      appendLog("El precio y las monedas deben ser números válidos.");
      return;
    }
    try {
      await callApi({
        path: "/store/coin-offers",
        method: "POST",
        body: {
          nombre: coinOfferForm.nombre.trim(),
          precioReal: priceResult.value,
          monedasObtenidas: coinsResult.value,
        },
        requestDescription: "crear oferta de monedas",
        successMessage: "Oferta de monedas creada.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, coinOfferForm]);

  const handleGetCoinOffers = useCallback(async () => {
    try {
      await callApi({
        path: "/store/coin-offers",
        method: "GET",
        requestDescription: "obtener ofertas de monedas",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [callApi]);

  const handleDeleteCoinOffer = useCallback(async () => {
    const result = ensureNumber(coinOfferId);
    if (!result.ok) {
      appendLog("Indica el ID de la oferta de monedas a eliminar.");
      return;
    }
    try {
      await callApi({
        path: `/store/coin-offers/${result.value}`,
        method: "DELETE",
        requestDescription: "eliminar oferta de monedas",
        successMessage: "Oferta eliminada correctamente.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, coinOfferId]);

  const handleBuyCoins = useCallback(async () => {
    const result = ensureNumber(coinOfferForm.offerId);
    if (!result.ok) {
      appendLog("Indica el ID de la oferta para comprar monedas.");
      return;
    }
    try {
      await callApi({
        path: "/store/buy-coins",
        method: "POST",
        body: { offerId: result.value },
        requestDescription: "compra de monedas",
        successMessage: "Compra de monedas iniciada.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, coinOfferForm]);

  const handleConfirmTransaction = useCallback(async () => {
    const result = ensureNumber(transactionId);
    if (!result.ok) {
      appendLog("Indica el ID de la transacción a confirmar.");
      return;
    }
    try {
      await callApi({
        path: "/store/confirm-payment",
        method: "POST",
        body: { transactionId: result.value },
        requestDescription: "confirmar compra",
        successMessage: "Transacción confirmada.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, transactionId]);

  const handleCancelTransaction = useCallback(async () => {
    const result = ensureNumber(transactionId);
    if (!result.ok) {
      appendLog("Indica el ID de la transacción a cancelar.");
      return;
    }
    try {
      await callApi({
        path: "/store/cancel-transaction",
        method: "POST",
        body: { transactionId: result.value },
        requestDescription: "cancelar transacción",
        successMessage: "Transacción cancelada.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, transactionId]);

  const handleSendChatMessage = useCallback(async () => {
    const receiverResult = ensureNumber(chatForm.receiverId);
    if (!receiverResult.ok || !chatForm.message.trim()) {
      appendLog("Indica receptor válido y escribe un mensaje para enviarlo.");
      return;
    }
    try {
      await callApi({
        path: "/chat/send",
        method: "POST",
        body: {
          receiverId: receiverResult.value,
          message: chatForm.message.trim(),
          messageType: chatForm.messageType.trim() || "text",
        },
        requestDescription: "enviar mensaje",
        successMessage: "Mensaje enviado.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, chatForm]);

  const handleGetChatHistory = useCallback(async () => {
    const receiverResult = ensureNumber(chatHistoryReceiverId);
    if (!receiverResult.ok) {
      appendLog("Indica el ID del usuario para consultar el historial de chat.");
      return;
    }
    try {
      await callApi({
        path: `/chat/history?receiverId=${receiverResult.value}`,
        method: "GET",
        requestDescription: "historial de chat",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, chatHistoryReceiverId]);

  const handleMarkMessageRead = useCallback(async () => {
    const messageIdResult = ensureNumber(chatReadMessageId);
    if (!messageIdResult.ok) {
      appendLog("Indica el ID del mensaje a marcar como leído.");
      return;
    }
    const payload = {};
    const receiverResult = ensureOptionalNumber(chatReadPayload.receiverId);
    if (!receiverResult.ok) {
      appendLog("El receiverId del cuerpo debe ser un número válido.");
      return;
    }
    if (typeof receiverResult.value !== "undefined") {
      payload.receiverId = receiverResult.value;
    }
    if (chatReadPayload.message.trim()) {
      payload.message = chatReadPayload.message.trim();
    }
    if (chatReadPayload.messageType.trim()) {
      payload.messageType = chatReadPayload.messageType.trim();
    }
    try {
      await callApi({
        path: `/chat/read/${messageIdResult.value}`,
        method: "PUT",
        body: payload,
        requestDescription: "marcar mensaje como leído",
        successMessage: "Mensaje marcado como leído.",
      });
    } catch (error) {
      // Manejado por callApi.
    }
  }, [appendLog, callApi, chatReadMessageId, chatReadPayload]);

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
                {selectedActionKey === "feed" && (
                  <View style={styles.inlineField}>
                    <Text style={styles.inlineFieldLabel}>ID de alimento</Text>
                    <TextInput
                      keyboardType="numeric"
                      onChangeText={setFeedItemId}
                      placeholder="Ej. 1"
                      placeholderTextColor="rgba(22, 28, 32, 0.45)"
                      style={styles.inlineFieldInput}
                      value={feedItemId}
                    />
                  </View>
                )}
                {selectedActionKey === "care" && (
                  <Text style={styles.actionHelperText}>
                    Envía cariño a la mascota y revisa el log para ver la respuesta.
                  </Text>
                )}
                {selectedActionKey === "refresh" && (
                  <Text style={styles.actionHelperText}>
                    Obtén el estado más reciente directamente del backend.
                  </Text>
                )}
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
                <Text style={styles.sectionTitle}>Integraciones con el backend</Text>
                <Text style={styles.sectionSubtitle}>
                  Configura la URL base y ejecuta los endpoints oficiales del servidor.
                </Text>
                <View style={styles.apiBaseRow}>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setBaseUrlInput}
                    placeholder="http://localhost:4004"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiBaseInput}
                    value={baseUrlInput}
                  />
                  <Pressable onPress={applyBaseUrl} style={styles.apiBaseButton}>
                    <Text style={styles.apiBaseButtonLabel}>Actualizar URL</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Autenticación</Text>
                  <Text style={styles.apiLabel}>Nombre</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setAuthCredentials((current) => ({ ...current, nombre: value }))
                    }
                    placeholder="Nombre del usuario"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={authCredentials.nombre}
                  />
                  <Text style={styles.apiLabel}>Correo electrónico</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={(value) =>
                      setAuthCredentials((current) => ({ ...current, email: value }))
                    }
                    placeholder="usuario@correo.com"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={authCredentials.email}
                  />
                  <Text style={styles.apiLabel}>Contraseña</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setAuthCredentials((current) => ({ ...current, password: value }))
                    }
                    placeholder="Contraseña segura"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    secureTextEntry
                    style={styles.apiInput}
                    value={authCredentials.password}
                  />
                  <Text style={styles.apiLabel}>Rol (opcional)</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setAuthCredentials((current) => ({ ...current, rol: value }))
                    }
                    placeholder="usuario / psicologo / admin"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={authCredentials.rol}
                  />
                  <View style={styles.apiButtonRow}>
                    <Pressable onPress={handleRegister} style={styles.apiButton}>
                      <Text style={styles.apiButtonText}>Registrar</Text>
                    </Pressable>
                    <Pressable onPress={handleLogin} style={styles.apiButton}>
                      <Text style={styles.apiButtonText}>Iniciar sesión</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={handleLogout} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Cerrar sesión</Text>
                  </Pressable>
                  <View style={styles.apiDivider} />
                  <Text style={styles.apiCardSubtitle}>Actualizar perfil de autenticación</Text>
                  <Text style={styles.apiLabel}>Nombre</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setAuthProfileForm((current) => ({ ...current, nombre: value }))
                    }
                    placeholder="Nuevo nombre"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={authProfileForm.nombre}
                  />
                  <Text style={styles.apiLabel}>Correo electrónico</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    onChangeText={(value) =>
                      setAuthProfileForm((current) => ({ ...current, email: value }))
                    }
                    placeholder="nuevo-correo@correo.com"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={authProfileForm.email}
                  />
                  <Pressable onPress={handleAuthProfileUpdate} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Guardar cambios</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Perfil</Text>
                  <Text style={styles.apiLabel}>Imagen de perfil</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setProfileForm((current) => ({ ...current, imagenPerfil: value }))
                    }
                    placeholder="nombre-archivo.png"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={profileForm.imagenPerfil}
                  />
                  <Text style={styles.apiLabel}>Nombre de usuario</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setProfileForm((current) => ({ ...current, nombreUsuario: value }))
                    }
                    placeholder="Nuevo nombre público"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={profileForm.nombreUsuario}
                  />
                  <Text style={styles.apiLabel}>Descripción</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setProfileForm((current) => ({ ...current, descripcion: value }))
                    }
                    placeholder="Biografía o mensaje"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={[styles.apiInput, styles.apiTextArea]}
                    value={profileForm.descripcion}
                  />
                  <Pressable onPress={handleProfileUpdate} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Actualizar perfil</Text>
                  </Pressable>
                  <View style={styles.apiButtonRow}>
                    <Pressable onPress={handleGetProfile} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Obtener perfil</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleGetProfileInventory}
                      style={styles.apiButtonSecondary}
                    >
                      <Text style={styles.apiButtonSecondaryText}>
                        Ver imágenes disponibles
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Mascota</Text>
                  <Text style={styles.apiHelpText}>
                    Usa las acciones rápidas para alimentar y acariciar a tu mascota.
                  </Text>
                  <View style={styles.apiButtonRow}>
                    <Pressable onPress={refreshStatus} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Actualizar estado</Text>
                    </Pressable>
                    <Pressable onPress={handleGetAccessories} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Ver accesorios</Text>
                    </Pressable>
                  </View>
                  <Pressable onPress={handleGetFoodAmount} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Ver alimentos disponibles</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Inventario</Text>
                  <Pressable onPress={handleGetInventory} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Obtener inventario</Text>
                  </Pressable>
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>itemId</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setInventoryForm((current) => ({ ...current, itemId: value }))
                        }
                        placeholder="Ej. 1"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={inventoryForm.itemId}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Cantidad</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setInventoryForm((current) => ({ ...current, cantidad: value }))
                        }
                        placeholder="Ej. 3"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={inventoryForm.cantidad}
                      />
                    </View>
                  </View>
                  <Pressable onPress={handleAddInventoryItem} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Agregar ítem</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>itemId a usar</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setInventoryUseItemId}
                    placeholder="Ej. 1"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={inventoryUseItemId}
                  />
                  <Pressable onPress={handleUseInventoryItem} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Usar ítem</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Comunidad</Text>
                  <Text style={styles.apiLabel}>Contenido</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setCommunityPostForm((current) => ({ ...current, contenido: value }))
                    }
                    placeholder="Comparte un mensaje..."
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={[styles.apiInput, styles.apiTextArea]}
                    value={communityPostForm.contenido}
                  />
                  <Text style={styles.apiLabel}>Tipo de usuario</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setCommunityPostForm((current) => ({ ...current, tipoUsuario: value }))
                    }
                    placeholder="usuario / psicologo / admin"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={communityPostForm.tipoUsuario}
                  />
                  <Pressable onPress={handleCreatePost} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Crear post</Text>
                  </Pressable>
                  <Pressable onPress={handleGetPosts} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Obtener posts</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID de post</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setCommunityTargetId}
                    placeholder="Ej. 2"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={communityTargetId}
                  />
                  <View style={styles.apiButtonRow}>
                    <Pressable onPress={handleLikePost} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Dar like</Text>
                    </Pressable>
                    <Pressable onPress={handleDeletePost} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Eliminar post</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Tareas</Text>
                  <Text style={styles.apiLabel}>Título</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setTaskForm((current) => ({ ...current, title: value }))
                    }
                    placeholder="Título de la tarea"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={taskForm.title}
                  />
                  <Text style={styles.apiLabel}>Descripción</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setTaskForm((current) => ({ ...current, description: value }))
                    }
                    placeholder="Detalles adicionales"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={[styles.apiInput, styles.apiTextArea]}
                    value={taskForm.description}
                  />
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Fecha límite</Text>
                      <TextInput
                        onChangeText={(value) =>
                          setTaskForm((current) => ({ ...current, dueDate: value }))
                        }
                        placeholder="2025-10-05T23:59:59.000Z"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={taskForm.dueDate}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Duración (hrs)</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setTaskForm((current) => ({ ...current, duration: value }))
                        }
                        placeholder="Ej. 1"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={taskForm.duration}
                      />
                    </View>
                  </View>
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Tipo</Text>
                      <TextInput
                        onChangeText={(value) =>
                          setTaskForm((current) => ({ ...current, type: value }))
                        }
                        placeholder="task / habit"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={taskForm.type}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Frecuencia</Text>
                      <TextInput
                        onChangeText={(value) =>
                          setTaskForm((current) => ({ ...current, frequency: value }))
                        }
                        placeholder="one-time / daily"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={taskForm.frequency}
                      />
                    </View>
                  </View>
                  <Text style={styles.apiLabel}>Categoría</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setTaskForm((current) => ({ ...current, category: value }))
                    }
                    placeholder="facultad / personal"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={taskForm.category}
                  />
                  <Pressable onPress={handleCreateTask} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Crear tarea</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID de tarea</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setTaskIdInput}
                    placeholder="Ej. 2"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={taskIdInput}
                  />
                  <View style={styles.apiButtonRow}>
                    <Pressable onPress={handleUpdateTask} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Actualizar</Text>
                    </Pressable>
                    <Pressable onPress={handleCompleteTask} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Completar</Text>
                    </Pressable>
                    <Pressable onPress={handleDeleteTask} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Eliminar</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.apiLabel}>Filtros (query)</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setTaskQuery}
                    placeholder="status=completed&type=task"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={taskQuery}
                  />
                  <Pressable onPress={handleGetTasks} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Consultar tareas</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Tienda</Text>
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>ID producto</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setStoreItemForm((current) => ({ ...current, itemId: value }))
                        }
                        placeholder="Ej. 1"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={storeItemForm.itemId}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Nombre</Text>
                      <TextInput
                        onChangeText={(value) =>
                          setStoreItemForm((current) => ({ ...current, nombre: value }))
                        }
                        placeholder="Sombrero pirata"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={storeItemForm.nombre}
                      />
                    </View>
                  </View>
                  <Text style={styles.apiLabel}>Tipo</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setStoreItemForm((current) => ({ ...current, tipo: value }))
                    }
                    placeholder="accesorio"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={storeItemForm.tipo}
                  />
                  <Text style={styles.apiLabel}>Descripción</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setStoreItemForm((current) => ({ ...current, descripcion: value }))
                    }
                    placeholder="Descripción del producto"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={[styles.apiInput, styles.apiTextArea]}
                    value={storeItemForm.descripcion}
                  />
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Precio</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setStoreItemForm((current) => ({ ...current, precio: value }))
                        }
                        placeholder="Ej. 15"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={storeItemForm.precio}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Cantidad</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setStoreItemForm((current) => ({ ...current, cantidad: value }))
                        }
                        placeholder="Ej. 10"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={storeItemForm.cantidad}
                      />
                    </View>
                  </View>
                  <Text style={styles.apiLabel}>Imagen</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setStoreItemForm((current) => ({ ...current, imagen: value }))
                    }
                    placeholder="imagen.png"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={storeItemForm.imagen}
                  />
                  <Pressable onPress={handleCreateStoreItem} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Crear producto</Text>
                  </Pressable>
                  <Pressable onPress={handleUpdateStoreItem} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Actualizar producto</Text>
                  </Pressable>
                  <Pressable onPress={handleGetStoreItems} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Obtener productos</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID para eliminar</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setStoreDeleteItemId}
                    placeholder="Ej. 1"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={storeDeleteItemId}
                  />
                  <Pressable onPress={handleDeleteStoreItem} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Eliminar producto</Text>
                  </Pressable>
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Comprar itemId</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setStorePurchaseForm((current) => ({ ...current, itemId: value }))
                        }
                        placeholder="Ej. 1"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={storePurchaseForm.itemId}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Cantidad</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setStorePurchaseForm((current) => ({ ...current, cantidad: value }))
                        }
                        placeholder="Ej. 5"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={storePurchaseForm.cantidad}
                      />
                    </View>
                  </View>
                  <Pressable onPress={handleBuyItem} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Comprar producto</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Ofertas y monedas</Text>
                  <Text style={styles.apiLabel}>Nombre de la oferta</Text>
                  <TextInput
                    onChangeText={(value) =>
                      setCoinOfferForm((current) => ({ ...current, nombre: value }))
                    }
                    placeholder="Paquete de 1000 monedas"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={coinOfferForm.nombre}
                  />
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Precio real</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setCoinOfferForm((current) => ({ ...current, precioReal: value }))
                        }
                        placeholder="Ej. 4.00"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={coinOfferForm.precioReal}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Monedas</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setCoinOfferForm((current) => ({ ...current, monedasObtenidas: value }))
                        }
                        placeholder="Ej. 1000"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={coinOfferForm.monedasObtenidas}
                      />
                    </View>
                  </View>
                  <Pressable onPress={handleCreateCoinOffer} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Crear oferta</Text>
                  </Pressable>
                  <Pressable onPress={handleGetCoinOffers} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Obtener ofertas</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID de oferta (comprar)</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={(value) =>
                      setCoinOfferForm((current) => ({ ...current, offerId: value }))
                    }
                    placeholder="Ej. 1"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={coinOfferForm.offerId}
                  />
                  <Pressable onPress={handleBuyCoins} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Comprar monedas</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID de oferta (eliminar)</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setCoinOfferId}
                    placeholder="Ej. 1"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={coinOfferId}
                  />
                  <Pressable onPress={handleDeleteCoinOffer} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Eliminar oferta</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID de transacción</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setTransactionId}
                    placeholder="Ej. 1"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={transactionId}
                  />
                  <View style={styles.apiButtonRow}>
                    <Pressable onPress={handleConfirmTransaction} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Confirmar compra</Text>
                    </Pressable>
                    <Pressable onPress={handleCancelTransaction} style={styles.apiButtonSecondary}>
                      <Text style={styles.apiButtonSecondaryText}>Cancelar compra</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Chat</Text>
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Receptor</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setChatForm((current) => ({ ...current, receiverId: value }))
                        }
                        placeholder="ID del usuario"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={chatForm.receiverId}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Tipo mensaje</Text>
                      <TextInput
                        onChangeText={(value) =>
                          setChatForm((current) => ({ ...current, messageType: value }))
                        }
                        placeholder="text / image"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={chatForm.messageType}
                      />
                    </View>
                  </View>
                  <Text style={styles.apiLabel}>Mensaje</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setChatForm((current) => ({ ...current, message: value }))
                    }
                    placeholder="Escribe tu mensaje"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={[styles.apiInput, styles.apiTextArea]}
                    value={chatForm.message}
                  />
                  <Pressable onPress={handleSendChatMessage} style={styles.apiButton}>
                    <Text style={styles.apiButtonText}>Enviar mensaje</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>Historial con usuario</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setChatHistoryReceiverId}
                    placeholder="ID del usuario"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={chatHistoryReceiverId}
                  />
                  <Pressable onPress={handleGetChatHistory} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Obtener historial</Text>
                  </Pressable>
                  <Text style={styles.apiLabel}>ID de mensaje leído</Text>
                  <TextInput
                    keyboardType="numeric"
                    onChangeText={setChatReadMessageId}
                    placeholder="ID del mensaje"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={styles.apiInput}
                    value={chatReadMessageId}
                  />
                  <View style={styles.apiRow}>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>receiverId (opcional)</Text>
                      <TextInput
                        keyboardType="numeric"
                        onChangeText={(value) =>
                          setChatReadPayload((current) => ({ ...current, receiverId: value }))
                        }
                        placeholder="Ej. 1"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={chatReadPayload.receiverId}
                      />
                    </View>
                    <View style={styles.apiRowItem}>
                      <Text style={styles.apiLabel}>Tipo</Text>
                      <TextInput
                        onChangeText={(value) =>
                          setChatReadPayload((current) => ({ ...current, messageType: value }))
                        }
                        placeholder="text"
                        placeholderTextColor="rgba(22, 28, 32, 0.45)"
                        style={styles.apiInput}
                        value={chatReadPayload.messageType}
                      />
                    </View>
                  </View>
                  <Text style={styles.apiLabel}>Mensaje (opcional)</Text>
                  <TextInput
                    multiline
                    onChangeText={(value) =>
                      setChatReadPayload((current) => ({ ...current, message: value }))
                    }
                    placeholder="Mensaje relacionado"
                    placeholderTextColor="rgba(22, 28, 32, 0.45)"
                    style={[styles.apiInput, styles.apiTextArea]}
                    value={chatReadPayload.message}
                  />
                  <Pressable onPress={handleMarkMessageRead} style={styles.apiButtonSecondary}>
                    <Text style={styles.apiButtonSecondaryText}>Marcar como leído</Text>
                  </Pressable>
                </View>

                <View style={styles.apiCard}>
                  <Text style={styles.apiCardTitle}>Última respuesta del backend</Text>
                  <View style={styles.responseContainer}>
                    <ScrollView
                      style={styles.responseScroll}
                      nestedScrollEnabled
                      persistentScrollbar
                    >
                      <Text style={styles.responseText}>
                        {lastApiResponse || "Realiza una solicitud para ver aquí la respuesta."}
                      </Text>
                    </ScrollView>
                  </View>
                </View>
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
  sectionSubtitle: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 18,
    lineHeight: 18,
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
  inlineField: {
    marginBottom: 16,
    gap: 6,
  },
  inlineFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2933",
  },
  inlineFieldInput: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.1)",
    fontSize: 15,
    color: "#1f2933",
  },
  actionHelperText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 16,
    lineHeight: 18,
  },
  apiBaseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  apiBaseInput: {
    flexGrow: 1,
    flexBasis: "60%",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.12)",
    color: "#1f2933",
    fontSize: 15,
  },
  apiBaseButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
  },
  apiBaseButtonLabel: {
    color: "#f8fafc",
    fontWeight: "700",
    fontSize: 14,
  },
  apiCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    marginBottom: 22,
  },
  apiCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2933",
    marginBottom: 12,
  },
  apiCardSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2933",
    marginBottom: 12,
    marginTop: 12,
  },
  apiLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2933",
    marginBottom: 6,
  },
  apiInput: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.1)",
    fontSize: 15,
    color: "#1f2933",
    marginBottom: 12,
  },
  apiTextArea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  apiButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  apiButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  apiButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f2933",
  },
  apiButtonSecondary: {
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  apiButtonSecondaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2933",
  },
  apiDivider: {
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    marginVertical: 16,
  },
  apiHelpText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 12,
    lineHeight: 18,
  },
  apiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  apiRowItem: {
    flex: 1,
    minWidth: 140,
  },
  responseContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  responseScroll: {
    maxHeight: 220,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  responseText: {
    fontSize: 13,
    color: "#1f2933",
    fontFamily: "Courier",
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