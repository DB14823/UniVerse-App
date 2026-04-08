import React, { useMemo, useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Image as RNImage,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { colours } from "../../lib/theme/colours";
import { createEvent } from "../../lib/eventsApi";
import { getCurrentUser } from "../../lib/postsApi";
import { AuthError, clearSession } from "../../lib/auth";
import DateTimePicker from "@react-native-community/datetimepicker";

const EVENT_CATEGORIES = [
  "Music",
  "Sports",
  "Academic",
  "Social",
  "Career",
  "Workshop",
  "Other",
] as const;

export default function AddEventOrg() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [refreshing, setRefreshing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [location, setLocation] = useState("");
  const [locationTouched, setLocationTouched] = useState(false);
  const [price, setPrice] = useState("£");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("Other");
  const [capacity, setCapacity] = useState("");

  const bottomPad = 110 + Math.max(insets.bottom, 0);

  const canConfirm = useMemo(() => {
    const hasPrice = price.replace(/[^0-9]/g, "").length > 0;
    return Boolean(title.trim() && eventDate && location.trim() && hasPrice);
  }, [title, eventDate, location, price]);

  const formatPriceDisplay = (rawValue: string) => {
    const cleaned = rawValue.replace(/£/g, "").replace(/[^0-9.]/g, "");
    if (!cleaned) {
      return "£";
    }

    const parts = cleaned.split(".");
    const whole = parts[0] || "0";
    const fractional = parts.slice(1).join("").slice(0, 2);
    const hasDot = parts.length > 1;

    return `£${whole}${hasDot ? "." + fractional : ""}`;
  };

  const normalizePrice = (rawValue: string) => {
    const cleaned = rawValue.replace(/£/g, "").replace(/[^0-9.]/g, "");
    if (!cleaned || cleaned === ".") {
      return "£0.00";
    }

    const parts = cleaned.split(".");
    const whole = parts[0] || "0";
    const fractional = (parts[1] || "").padEnd(2, "0").slice(0, 2);

    return `£${whole}.${fractional}`;
  };

  const formattedDate = useMemo(() => {
    if (!eventDate) {
      return "";
    }

    return eventDate.toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [eventDate]);

  useEffect(() => {
    let isActive = true;

    const loadOrgLocation = async () => {
      if (locationTouched || location.trim()) {
        return;
      }

      try {
        const storedLocation = await SecureStore.getItemAsync("orgLocation");
        if (
          isActive &&
          storedLocation &&
          !locationTouched &&
          !location.trim()
        ) {
          setLocation(storedLocation);
        }

        const user = await getCurrentUser();
        if (
          isActive &&
          user?.role === "ORGANISATION" &&
          user.location &&
          !locationTouched &&
          !location.trim()
        ) {
          setLocation(user.location);
        }
      } catch {}
    };

    loadOrgLocation();

    return () => {
      isActive = false;
    };
  }, [locationTouched, location]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 600));
    setRefreshing(false);
  }, []);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission Required",
        "Please allow access to your photo library.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleConfirm = async () => {
    if (!canConfirm) {
      Alert.alert(
        "Missing fields",
        "Please fill in title, date, location and price.",
      );
      return;
    }

    try {
      // Convert price string to number for Decimal type
      const priceString = normalizePrice(price);
      const priceNumber = parseFloat(priceString.replace(/[^0-9.]/g, "")) || 0;

      await createEvent({
        title: title.trim(),
        description: description.trim(),
        date: eventDate?.toISOString() ?? "",
        location: location.trim(),
        price: priceNumber,
        category,
        capacity: capacity ? parseInt(capacity, 10) : null,
        imageUri,
      });

      Alert.alert("Success", "Event created successfully!", [
        {
          text: "OK",
          onPress: () => router.replace("/Organisations/createEvent"),
        },
      ]);

      setTitle("");
      setDescription("");
      setEventDate(null);
      setLocation("");
      setLocationTouched(false);
      setPrice("£");
      setImageUri(null);
      setCategory("Other");
      setCapacity("");
    } catch (error: any) {
      if (error instanceof AuthError) {
        // token expired or other auth problem
        await clearSession();
        router.replace("/");
        return;
      }
      Alert.alert(
        "Error",
        error.message || "Failed to create event. Please try again.",
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.pageTitle}>Create Event</Text>
        <Text style={styles.pageSubtitle}>
          Fill in the details below to publish a new event.
        </Text>
        <View style={styles.card}>
          {/* Image Upload */}
          <TouchableOpacity
            style={styles.imageUploadArea}
            onPress={pickImage}
            activeOpacity={0.9}
          >
            {imageUri ? (
              <RNImage source={{ uri: imageUri }} style={styles.image} />
            ) : (
              <View style={styles.imageUploadPlaceholder}>
                <Ionicons
                  name="image-outline"
                  size={32}
                  color={colours.textMuted}
                />
                <Text style={styles.imageUploadText}>Add Event Image</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Event Title */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Event Title</Text>
            <TextInput
              style={styles.fieldInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter event name"
              placeholderTextColor={colours.textMuted}
            />
          </View>

          {/* Description */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="What's your event about?"
              placeholderTextColor={colours.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {EVENT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    category === cat && styles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      category === cat && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Date/Time */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Date & Time</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={colours.textSecondary}
                style={{ marginRight: 10 }}
              />
              <Text
                style={[
                  styles.dateInputText,
                  !formattedDate && styles.datePlaceholder,
                ]}
              >
                {formattedDate || "Select date and time"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={eventDate ?? new Date()}
                mode="datetime"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selectedDate) => {
                  if (Platform.OS !== "ios") {
                    setShowDatePicker(false);
                  }

                  if (selectedDate) {
                    setEventDate(selectedDate);
                  }
                }}
              />
            )}

            {Platform.OS === "ios" && showDatePicker && (
              <TouchableOpacity
                style={styles.dateDoneBtn}
                onPress={() => setShowDatePicker(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.dateDoneText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Location */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Location</Text>
            <TextInput
              style={styles.fieldInput}
              value={location}
              onChangeText={(value) => {
                setLocationTouched(true);
                setLocation(value);
              }}
              placeholder="e.g. Student Union"
              placeholderTextColor={colours.textMuted}
            />
            <TouchableOpacity
              style={styles.locationHintBtn}
              onPress={async () => {
                try {
                  const storedLocation =
                    await SecureStore.getItemAsync("orgLocation");
                  const user = await getCurrentUser();
                  const nextLocation =
                    storedLocation ||
                    (user?.role === "ORGANISATION" ? user.location : null);

                  if (nextLocation) {
                    setLocationTouched(true);
                    setLocation(nextLocation);
                  }
                } catch {}
              }}
              activeOpacity={0.85}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={colours.textSecondary}
                style={{ marginRight: 4 }}
              />
              <Text style={styles.locationHintText}>
                Use organisation location
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Price</Text>
            <TextInput
              style={styles.fieldInput}
              value={price}
              onChangeText={(value) => setPrice(formatPriceDisplay(value))}
              onBlur={() => setPrice(normalizePrice(price))}
              placeholder="e.g. £10.00"
              placeholderTextColor={colours.textMuted}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Capacity */}
          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Ticket Capacity (Optional)</Text>
            <TextInput
              style={styles.fieldInput}
              value={capacity}
              onChangeText={setCapacity}
              placeholder="Leave empty for unlimited tickets"
              placeholderTextColor={colours.textMuted}
              keyboardType="numeric"
            />
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              !canConfirm && styles.confirmBtnDisabled,
            ]}
            onPress={handleConfirm}
            activeOpacity={0.85}
            disabled={!canConfirm}
          >
            <Text style={styles.confirmText}>Create Event</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },

  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },

  pageTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: colours.textPrimary,
    marginBottom: 4,
    marginTop: 6,
  },

  pageSubtitle: {
    fontSize: 14,
    color: colours.textMuted,
    marginBottom: 16,
  },

  card: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.14 : 0.34,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 10,
    elevation: 6,
  },

  imageUploadArea: {
    height: 180,
    borderRadius: 18,
    backgroundColor: colours.surfaceElevated,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colours.border,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
  },

  imageUploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },

  imageUploadText: {
    color: colours.textMuted,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },

  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  fieldWrap: {
    marginBottom: 14,
  },

  fieldLabel: {
    color: colours.textPrimary,
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 8,
  },

  fieldInput: {
    backgroundColor: colours.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colours.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colours.border,
  },

  descriptionInput: {
    backgroundColor: colours.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: colours.textPrimary,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colours.border,
    minHeight: 100,
    textAlignVertical: "top",
  },

  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colours.surfaceElevated,
    borderWidth: 1,
    borderColor: colours.border,
  },

  categoryChipActive: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },

  categoryChipText: {
    color: colours.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },

  categoryChipTextActive: {
    color: colours.textPrimary,
  },

  dateInput: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: colours.surfaceElevated,
    flexDirection: "row",
    alignItems: "center",
  },

  dateInputText: {
    color: colours.textPrimary,
    fontSize: 15,
  },

  datePlaceholder: {
    color: colours.textMuted,
  },

  dateDoneBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },

  dateDoneText: {
    color: colours.textPrimary,
    fontWeight: "700",
  },

  locationHintBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colours.glass,
    borderWidth: 1,
    borderColor: colours.border,
    alignSelf: "flex-start",
  },

  locationHintText: {
    color: colours.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colours.primary,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },

  confirmBtnDisabled: {
    opacity: 0.5,
  },

  confirmText: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "800",
  },
});
