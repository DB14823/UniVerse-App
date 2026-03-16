import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  RefreshControl,
  Modal,
  Pressable,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colours } from "../../lib/theme/colours";
import { useTickets, Ticket } from "../../contexts/TicketsContext";
import { cancelTicket } from "../../lib/ticketsApi";
import Animated, { FadeInDown } from "react-native-reanimated";

type TabType = "Upcoming" | "All" | "Past";

export default function MyTickets() {
  const insets = useSafeAreaInsets();
  const { tickets, refreshTickets } = useTickets();

  const [activeTab, setActiveTab] = useState<TabType>("Upcoming");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [fullscreenQR, setFullscreenQR] = useState(false);
  const [fullscreenQRTicket, setFullscreenQRTicket] = useState<Ticket | null>(null);
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshTickets();
    } catch (err) {
      console.warn("failed to refresh from server", err);
      await new Promise((res) => setTimeout(res, 800));
    }
    setRefreshing(false);
  }, [refreshTickets]);

  const handleDeleteTicket = async (ticket: Ticket) => {
    Alert.alert(
      "Delete Ticket",
      "Are you sure you want to delete this used ticket?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeletingTicketId(ticket.id);
            try {
              await cancelTicket(ticket.id);
              await refreshTickets();
            } catch (err) {
              console.warn("Failed to delete ticket", err);
              Alert.alert("Error", "Failed to delete ticket. Please try again.");
            }
            setDeletingTicketId(null);
          },
        },
      ]
    );
  };

  // Filter tickets by tab
  const getFilteredByTab = (ticketList: Ticket[]) => {
    const now = new Date();
    switch (activeTab) {
      case "Upcoming":
        return ticketList.filter((t) => !t.used && new Date(t.date) >= now);
      case "Past":
        return ticketList.filter((t) => t.used || new Date(t.date) < now);
      case "All":
      default:
        return ticketList;
    }
  };

  // Further filter by search query
  const filteredTickets = getFilteredByTab(
    tickets.filter((t) =>
      searchQuery ? t.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
  );

  const bottomPad = 100 + Math.max(insets.bottom, 0);

  const renderTicketCard = (t: Ticket, index: number) => {
    const isUsed = t.used;
    const isPast = new Date(t.date) < new Date();
    const showDeleteButton = isUsed;

    return (
      <Animated.View key={t.id} entering={FadeInDown.delay(index * 50).springify()}>
        <Pressable
          style={[styles.ticketItem, (isUsed || isPast) && styles.usedTicketItem]}
          onPress={() => setSelectedTicket(t)}
        >
          {t.eventImageUrl && (
            <Image
              source={{ uri: t.eventImageUrl }}
              style={[styles.eventImage, (isUsed || isPast) && styles.usedEventImage]}
            />
          )}
          <View style={styles.ticketContent}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.ticketTitle, (isUsed || isPast) && styles.usedTicketTitle]} numberOfLines={2}>
                {t.title}
              </Text>
              {isUsed && (
                <View style={styles.usedBadge}>
                  <Text style={styles.usedBadgeText}>Used</Text>
                </View>
              )}
              {!isUsed && isPast && (
                <View style={styles.expiredBadge}>
                  <Text style={styles.expiredBadgeText}>Expired</Text>
                </View>
              )}
            </View>
            <Text style={[styles.ticketMeta, (isUsed || isPast) && styles.usedTicketMeta]}>
              {`${t.dateLabelDate} ${t.dateLabelTime}`}
            </Text>
            <Text style={[styles.ticketMeta, (isUsed || isPast) && styles.usedTicketMeta]}>
              {`Location: ${t.location}`}
            </Text>
            <Text style={[styles.ticketMeta, (isUsed || isPast) && styles.usedTicketMeta]}>
              {`Price: ${t.price}`}
            </Text>
            {isUsed && t.usedAt && (
              <Text style={styles.scannedText}>
                Scanned on {new Date(t.usedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          {showDeleteButton && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteTicket(t)}
              disabled={deletingTicketId === t.id}
            >
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const renderEmptyState = () => {
    let message = "";
    switch (activeTab) {
      case "Upcoming":
        message = "No upcoming tickets";
        break;
      case "Past":
        message = "No past tickets";
        break;
      case "All":
        message = "No tickets yet";
        break;
    }
    return (
      <View style={styles.emptyState}>
        <Ionicons name="ticket-outline" size={48} color={colours.textMuted} />
        <Text style={styles.emptyStateText}>{message}</Text>
        <Text style={styles.emptyStateSubtext}>Browse events to get tickets!</Text>
      </View>
    );
  };

  // Helper to check if QR should be shown
  const canShowQR = (ticket: Ticket | null) => {
    if (!ticket) return false;
    const isPast = new Date(ticket.date) < new Date();
    return !ticket.used && !isPast;
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        {(["Upcoming", "All", "Past"] as TabType[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tickets..."
          placeholderTextColor={colours.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: bottomPad }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colours.textSecondary}
          />
        }
      >
        {filteredTickets.length > 0
          ? filteredTickets.map((ticket, index) => renderTicketCard(ticket, index))
          : renderEmptyState()}
      </ScrollView>

      {/* Modal for ticket details */}
      <Modal
        visible={Boolean(selectedTicket)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTicket(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedTicket(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => null}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedTicket?.title}</Text>
              <TouchableOpacity onPress={() => setSelectedTicket(null)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMeta}>{selectedTicket?.dateLabel}</Text>
            <Text style={styles.modalMeta}>{selectedTicket?.location}</Text>
            <Text style={styles.modalMeta}>{selectedTicket?.price}</Text>

            {selectedTicket?.used && (
              <View style={styles.modalStatusBanner}>
                <Text style={styles.modalStatusIcon}>✓</Text>
                <Text style={styles.modalStatusText}>
                  This ticket has been used
                </Text>
                {selectedTicket.usedAt && (
                  <Text style={styles.modalStatusSubtext}>
                    Scanned on {new Date(selectedTicket.usedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            )}

            {selectedTicket && !selectedTicket.used && new Date(selectedTicket.date) < new Date() && (
              <View style={styles.modalStatusBanner}>
                <Text style={styles.modalStatusIcon}>⏱</Text>
                <Text style={styles.modalStatusText}>
                  This event has passed
                </Text>
                <Text style={styles.modalStatusSubtext}>
                  QR code is no longer valid
                </Text>
              </View>
            )}

            {canShowQR(selectedTicket) && (
              <View style={styles.qrContainer}>
                <Pressable
                  onPress={() => {
                    setFullscreenQRTicket(selectedTicket);
                    setFullscreenQR(true);
                    setSelectedTicket(null);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {({ pressed }) => (
                    <Image
                      source={{
                        uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                          selectedTicket.ticketId
                        )}&size=300x300`,
                      }}
                      style={[styles.qrCode, { opacity: pressed ? 0.8 : 1 }]}
                    />
                  )}
                </Pressable>
                <Text style={styles.qrHint}>Tap to enlarge</Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Fullscreen QR code modal */}
      <Modal
        visible={fullscreenQR}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setFullscreenQR(false);
          setFullscreenQRTicket(null);
        }}
      >
        <Pressable
          style={styles.fullscreenBackdrop}
          onPress={() => {
            setFullscreenQR(false);
            setFullscreenQRTicket(null);
          }}
        >
          <View style={styles.fullscreenCard}>
            <Text style={styles.fullscreenTitle}>{fullscreenQRTicket?.title}</Text>
            <Text style={styles.fullscreenSubtitle}>
              {fullscreenQRTicket?.dateLabelDate} • {fullscreenQRTicket?.location}
            </Text>

            {fullscreenQRTicket && (
              <View style={styles.fullscreenQRWrap}>
                <Image
                  source={{
                    uri: `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                      fullscreenQRTicket.ticketId
                    )}&size=400x400`,
                  }}
                  style={styles.fullscreenQRCode}
                />
              </View>
            )}

            <Text style={styles.fullscreenInstructions}>
              Show this QR code at the event entrance
            </Text>

            <TouchableOpacity
              style={styles.fullscreenCloseBtn}
              onPress={() => {
                setFullscreenQR(false);
                setFullscreenQRTicket(null);
              }}
            >
              <Text style={styles.fullscreenCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colours.background,
  },

  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },

  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colours.surface,
    borderWidth: 1,
    borderColor: colours.border,
  },

  activeTab: {
    backgroundColor: colours.primary,
    borderColor: colours.primary,
  },

  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: colours.textSecondary,
  },

  activeTabText: {
    color: "#fff",
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  searchInput: {
    backgroundColor: colours.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colours.textPrimary,
    borderWidth: 1,
    borderColor: colours.border,
  },

  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },

  ticketItem: {
    backgroundColor: colours.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.32,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 12,
    overflow: "hidden",
  },

  usedTicketItem: {
    opacity: 0.7,
  },

  eventImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },

  usedEventImage: {
    opacity: 0.6,
  },

  ticketContent: {
    padding: 15,
  },

  ticketHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  ticketTitle: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },

  usedTicketTitle: {
    color: colours.textMuted,
  },

  usedBadge: {
    backgroundColor: colours.textMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },

  usedBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  expiredBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },

  expiredBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },

  ticketMeta: {
    color: colours.textMuted,
    fontSize: 14,
    marginTop: 4,
  },

  usedTicketMeta: {
    color: colours.textSecondary,
  },

  scannedText: {
    color: colours.textMuted,
    fontSize: 12,
    marginTop: 8,
    fontStyle: "italic",
  },

  deleteButton: {
    position: "absolute",
    bottom: 15,
    right: 15,
    backgroundColor: "#ef4444",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },

  deleteButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },

  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: colours.textSecondary,
    marginTop: 8,
  },

  emptyStateSubtext: {
    fontSize: 14,
    color: colours.textMuted,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    padding: 18,
    justifyContent: "center",
  },

  modalCard: {
    backgroundColor: colours.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colours.border,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colours.textPrimary,
    flex: 1,
  },

  modalClose: {
    fontSize: 16,
    fontWeight: "600",
    color: colours.primary,
  },

  modalMeta: {
    fontSize: 16,
    fontWeight: "600",
    color: colours.textPrimary,
    marginTop: 6,
  },

  modalStatusBanner: {
    backgroundColor: colours.surfaceElevated,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colours.border,
  },

  modalStatusIcon: {
    fontSize: 28,
    marginBottom: 8,
  },

  modalStatusText: {
    color: colours.textMuted,
    fontSize: 15,
    fontWeight: "600",
  },

  modalStatusSubtext: {
    color: colours.textMuted,
    fontSize: 13,
    marginTop: 4,
  },

  qrContainer: {
    alignItems: "center",
    marginTop: 20,
  },

  qrCode: {
    width: 260,
    height: 260,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colours.border,
  },

  qrHint: {
    fontSize: 13,
    color: colours.textSecondary,
    marginTop: 10,
  },

  fullscreenBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  fullscreenCard: {
    backgroundColor: colours.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
  },

  fullscreenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colours.textPrimary,
    textAlign: "center",
    marginBottom: 4,
  },

  fullscreenSubtitle: {
    fontSize: 14,
    color: colours.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },

  fullscreenQRWrap: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
  },

  fullscreenQRCode: {
    width: 280,
    height: 280,
  },

  fullscreenInstructions: {
    fontSize: 14,
    color: colours.textMuted,
    textAlign: "center",
    marginTop: 20,
  },

  fullscreenCloseBtn: {
    marginTop: 20,
    backgroundColor: colours.primary,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
  },

  fullscreenCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
