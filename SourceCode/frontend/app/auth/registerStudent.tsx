import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../lib/api";
import ThemedInput from "../components/ThemedInput";
import ThemedButton from "../components/ThemedButton";
import CosmicBackground from "../components/CosmicBackground";
import { colours, spacing, borderRadius } from "../../lib/theme/colours";

export default function RegisterStudent() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const isValidStudentEmail = (value: string) =>
    value.toLowerCase().endsWith("@students.plymouth.ac.uk");

  const isStrongPassword = (value: string) =>
    value.length >= 8 && /\d/.test(value);

  const registerRequest = async (
    emailValue: string,
    usernameValue: string,
    passwordValue: string,
  ) => {
    const url = `${API_URL}/auth/register-student`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailValue,
        username: usernameValue,
        password: passwordValue,
        name: "Student",
      }),
    });

    const raw = await response.text();

    let data: any = null;
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(`Non-JSON response (HTTP ${response.status})`);
      }
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Registration failed (HTTP ${response.status})`,
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
        username: string;
        role: string;
        name?: string;
      };
    };
  };

  const validateForm = () => {
    const newErrors = {
      email: "",
      username: "",
      password: "",
      confirmPassword: "",
    };

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    if (!trimmedEmail) {
      newErrors.email = "Email is required";
    } else if (!isValidStudentEmail(trimmedEmail)) {
      newErrors.email = "Must be a @students.plymouth.ac.uk email";
    }

    if (!trimmedUsername) {
      newErrors.username = "Username is required";
    } else if (trimmedUsername.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(trimmedUsername)) {
      newErrors.username = "Only letters, numbers, and underscores";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (!isStrongPassword(password)) {
      newErrors.password = "Min 8 characters with at least 1 number";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some((error) => error !== "");
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();

    setLoading(true);

    try {
      const { token, user } = await registerRequest(
        trimmedEmail,
        trimmedUsername,
        password,
      );

      await SecureStore.setItemAsync("authToken", token);
      await SecureStore.setItemAsync("userId", user.id);
      await SecureStore.setItemAsync("username", user.username);
      await SecureStore.setItemAsync("userRole", user.role);
      await SecureStore.setItemAsync("role", user.role);

      Alert.alert("Welcome to UniVerse!", "Your account has been created.");
      router.replace("/Students/EventFeed");
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
            <Text style={styles.title}>Join UniVerse</Text>
            <Text style={styles.subtitle}>Create your student account</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colours.primary}
              />
              <Text style={styles.sectionLabel}>Your Identity</Text>
            </View>

            <ThemedInput
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (errors.username) setErrors({ ...errors, username: "" });
              }}
              autoCapitalize="none"
              error={errors.username}
            />

            <ThemedInput
              label="Student Email"
              placeholder="yourname@students.plymouth.ac.uk"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errors.email) setErrors({ ...errors, email: "" });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <View style={styles.divider} />

            <View style={styles.sectionHeader}>
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colours.primary}
              />
              <Text style={styles.sectionLabel}>Security</Text>
            </View>

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

            <ThemedInput
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword)
                  setErrors({ ...errors, confirmPassword: "" });
              }}
              secureTextEntry
              error={errors.confirmPassword}
            />

            <View style={styles.hint}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={colours.textMuted}
              />
              <Text style={styles.hintText}>
                Must use your @students.plymouth.ac.uk email
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <ThemedButton
                title="Create Account"
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
            disabled={loading}
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
    textShadowColor: colours.glow,
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
    borderColor: colours.border,
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
    color: colours.primary,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  divider: {
    height: 1,
    backgroundColor: colours.border,
    marginVertical: spacing.lg,
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  hintText: {
    fontSize: 12,
    color: colours.textMuted,
    flex: 1,
  },
  buttonContainer: {
    width: "100%",
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
    color: colours.primary,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
