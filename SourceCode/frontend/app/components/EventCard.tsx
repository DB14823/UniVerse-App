import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colours } from "../../lib/theme/colours";

interface EventCardProps {
  id: string;
  title: string;
  dateLabelDate: string;
  dateLabelTime?: string;
  price: string;
  eventImageUrl?: string | null;
  ticketCount?: number;
  onPress: (eventId: string) => void;
}

export default function EventCard({
  id,
  title,
  dateLabelDate,
  dateLabelTime,
  price,
  eventImageUrl,
  ticketCount,
  onPress,
}: EventCardProps) {
  const handlePress = () => {
    onPress(id);
  };

  return (
    <Pressable style={styles.eventCard} onPress={handlePress}>
      <View style={styles.eventImage}>
        {eventImageUrl ? (
          <Image
            source={{ uri: eventImageUrl }}
            style={styles.eventImageFill}
          />
        ) : (
          <View style={styles.eventImagePlaceholder}>
            <Ionicons name="image-outline" size={40} color={colours.textMuted} />
          </View>
        )}
      </View>

      <View style={styles.eventInfoRow}>
        <View style={styles.eventLeft}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {dateLabelDate}
          </Text>
          {dateLabelTime ? (
            <Text style={styles.eventMeta} numberOfLines={1}>
              {dateLabelTime}
            </Text>
          ) : null}
        </View>

        <View style={styles.eventRight}>
          <Text style={styles.eventMetaRight} numberOfLines={1}>
            {price}
          </Text>
          {ticketCount !== undefined && (
            <Text style={styles.ticketCount} numberOfLines={1}>
              {ticketCount} {ticketCount === 1 ? 'ticket' : 'tickets'}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  eventCard: {
    backgroundColor: colours.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  eventImage: {
    height: 160,
    backgroundColor: colours.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  eventImageFill: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  eventImagePlaceholder: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colours.surfaceElevated,
  },
  eventInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  eventLeft: {
    flex: 1,
    marginRight: 12,
  },
  eventTitle: {
    color: colours.textPrimary,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  eventMeta: {
    color: colours.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  eventRight: {
    alignItems: "flex-end",
    justifyContent: "center",
  },
  eventMetaRight: {
    color: colours.secondary,
    fontSize: 16,
    fontWeight: "700",
  },
  ticketCount: {
    color: colours.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
});
