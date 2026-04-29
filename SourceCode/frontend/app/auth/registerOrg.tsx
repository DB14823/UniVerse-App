import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  Platform,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../lib/api";
import {
  colours,
  spacing,
  borderRadius,
  shadows,
} from "../../lib/theme/colours";
import ThemedInput from "../components/ThemedInput";
import ThemedButton from "../components/ThemedButton";
import CosmicBackground from "../components/CosmicBackground";

export default function RegisterOrg() {
  const router = useRouter();

  const [orgName, setOrgName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    orgName: "",
    orgLocation: "",
    email: "",
    password: "",
  });

  const isValidEmail = (v: string) => /\S+@\S+\.\S+/.test(v.trim());
  const isStrongPassword = (v: string) => v.length >= 8 && /\d/.test(v);

  const pickEvidence = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setEvidenceUri(result.assets[0].uri);
    }
  };

  const registerRequest = async () => {
    const url = `${API_URL}/auth/register-org`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: orgName.trim(),
        location: orgLocation.trim(),
        email: email.trim(),
        password,
      }),
    });

    const raw = await res.text();

    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response (HTTP ${res.status})`);
      }
    }

    if (!res.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Registration failed (HTTP ${res.status})`,
      );
    }

    if (!data?.token || !data?.user) {
      throw new Error("Registration response missing token/user");
    }

    return data as {
      token: string;
      user: {
        id: string;
        email: string;
        role: string;
        name?: string;
        username?: string;
        location?: string | null;
      };
    };
  };

  const validateForm = () => {
    const newErrors = {
      orgName: "",
      orgLocation: "",
      email: "",
      password: "",
    };

    if (!orgName.trim()) {
      newErrors.orgName = "Organisation name is required";
    }

    if (!orgLocation.trim()) {
      newErrors.orgLocation = "Location is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isStrongPassword(password)) {
      newErrors.password = "Min 8 characters with at least 1 number";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    if (!evidenceUri) {
      Alert.alert("Evidence Required", "Please upload a photo as evidence.");
      return;
    }

    setLoading(true);

    try {
      const { token, user } = await registerRequest();

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);
      await SecureStore.setItemAsync("userRole", user.role);
      await SecureStore.setItemAsync("role", user.role);

      if (user?.username) {
        await SecureStore.setItemAsync("username", user.username);
      } else if (user?.name) {
        await SecureStore.setItemAsync("username", user.name);
      }

      if (user?.location) {
        await SecureStore.setItemAsync("orgLocation", user.location);
      } else if (orgLocation.trim()) {
        await SecureStore.setItemAsync("orgLocation", orgLocation.trim());
      }

      await SecureStore.setItemAsync("orgEvidenceUri", evidenceUri);

      Alert.alert("Welcome!", "Organisation account created successfully.");
      router.replace("../Organisations/eventsOrg");
    } catch (err: any) {
      Alert.alert("Registration failed", err?.message || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../assets/images/Space.png")}
      style={styles.container}
      imageStyle={{ resizeMode: "cover" }}
    >
      <CosmicBackground />
      <View style={styles.overlay} />

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.85}
      >
        <Ionicons name="arrow-back" size={20} color={colours.textPrimary} />
      </TouchableOpacity>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerSection}>
            <Text style={styles.title}>Register Org</Text>
            <Text style={styles.subtitle}>
              Set up your organisation account
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="business-outline"
                size={16}
                color={colours.secondary}
              />
              <Text style={[styles.sectionLabel, { color: colours.secondary }]}>
                Organisation Details
              </Text>
            </View>

            <ThemedInput
              label="Organisation Name"
              placeholder="Uni Society / Venue / Club"
              value={orgName}
              onChangeText={(text) => {
                setOrgName(text);
                if (errors.orgName) setErrors({ ...errors, orgName: "" });
              }}
              autoCapitalize="words"
              error={errors.orgName}
            />

            <ThemedInput
              label="Location"
              placeholder="Street, City"
              value={orgLocation}
              onChangeText={(text) => {
                setOrgLocation(text);
                if (errors.orgLocation)
                  setErrors({ ...errors, orgLocation: "" });
              }}
              autoCapitalize="words"
              error={errors.orgLocation}
            />

            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colours.secondary}
              />
              <Text style={[styles.sectionLabel, { color: colours.secondary }]}>
                Account & Security
              </Text>
            </View>

            <ThemedInput
              label="Organisation Email"
              placeholder="org@email.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <ThemedInput
              label="Create Password"
              placeholder="Minimum 8 characters"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: "" });
              }}
              secureTextEntry
              error={errors.password}
            />

            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={colours.secondary}
              />
              <Text style={[styles.sectionLabel, { color: colours.secondary }]}>
                Verification
              </Text>
            </View>

            <Text style={styles.evidenceDescription}>
              Upload a photo to verify your organisation (e.g. a society card or
              official document).
            </Text>

            <TouchableOpacity
              style={[
                styles.evidenceBtn,
                evidenceUri && styles.evidenceBtnFilled,
              ]}
              onPress={pickEvidence}
              activeOpacity={0.85}
            >
              <Ionicons
                name={evidenceUri ? "checkmark-circle" : "cloud-upload-outline"}
                size={22}
                color={evidenceUri ? colours.success : colours.textSecondary}
              />
              <Text
                style={[
                  styles.evidenceBtnText,
                  evidenceUri && styles.evidenceBtnTextFilled,
                ]}
              >
                {evidenceUri
                  ? "Photo selected — tap to change"
                  : "Upload evidence photo"}
              </Text>
            </TouchableOpacity>

            {evidenceUri && (
              <View style={styles.previewWrap}>
                <Image
                  source={{ uri: evidenceUri }}
                  style={styles.previewImage}
                />
              </View>
            )}

            <View style={styles.buttonContainer}>
              <ThemedButton
                title="Create Organisation"
                onPress={handleRegister}
                loading={loading}
                variant="primary"
                size="large"
                fullWidth
                glow
              />
            </View>
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
          >
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <Text style={[styles.loginLinkText, styles.loginLinkAccent]}>
              Sign in
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignSelf: "stretch",
    backgroundColor: colours.background,
  },
  keyboardView: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5, 8, 16, 0.70)",
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: colours.glass,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderWidth: 1.5,
    borderColor: colours.border,
  },
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xxxl,
    paddingTop: 120,
    paddingBottom: spacing.xxl,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: 40,
    fontWeight: "800",
    color: colours.textPrimary,
    textShadowColor: colours.glowCyan,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: colours.textSecondary,
    letterSpacing: 0.3,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(10, 14, 31, 0.75)",
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: "rgba(6, 182, 212, 0.15)",
    padding: spacing.xxl,
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(6, 182, 212, 0.1)",
    marginVertical: spacing.lg,
  },
  evidenceDescription: {
    fontSize: 13,
    color: colours.textMuted,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  evidenceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colours.surface,
    width: "100%",
    minHeight: 56,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colours.border,
    borderStyle: "dashed",
  },
  evidenceBtnFilled: {
    borderStyle: "solid",
    borderColor: colours.success,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  evidenceBtnText: {
    color: colours.textSecondary,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  evidenceBtnTextFilled: {
    color: colours.success,
  },
  previewWrap: {
    width: "100%",
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    backgroundColor: colours.surfaceElevated,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  previewImage: {
    width: "100%",
    height: 160,
    resizeMode: "cover",
  },
  buttonContainer: {
    width: "100%",
    marginTop: spacing.sm,
  },
  loginLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.sm,
  },
  loginLinkText: {
    fontSize: 14,
    color: colours.textSecondary,
    fontWeight: "500",
  },
  loginLinkAccent: {
    color: colours.secondary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
