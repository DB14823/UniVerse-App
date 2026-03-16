import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Platform,
  StyleSheet,
  Image,
  Modal,
  Pressable,
  TouchableOpacity,
  Linking,
} from "react-native";
import FilterBar from "../components/FilterBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { colours } from "../../lib/theme/colours";
import { Spacing } from "../../lib/theme/spacing";
import { useTabRefresh } from "../hooks/useTabRefresh";
import { getEvents, EventRecord } from "../../lib/eventsApi";
import { getStaticMapUrl } from "../../lib/staticMaps";
import { purchaseTicket } from "../../lib/ticketsApi";
import { useTickets, Ticket } from "../../contexts/TicketsContext";
import { Alert } from "react-native";

const EVENT_CATEGORIES = [
  { label: "All Categories", value: "All" },
  { label: "Music", value: "Music" },
  { label: "Sports", value: "Sports" },
  { label: "Academic", value: "Academic" },
  { label: "Social", value: "Social" },
  { label: "Career", value: "Career" },
  { label: "Workshop", value: "Workshop" },
  { label: "Other", value: "Other" },
];

type EventItem = {
  id: string;
  title: string;
  description: string;
  dateLabel: string;
  dateLabelDate: string;
  dateLabelTime: string;
  location: string;
  price: string;
  category: string;
  eventImageUrl: string | null;
  mapLocation: string;
  date: Date;
};

export default function EventFeed() {

  const [selectedDay, setSelectedDay] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [value, setValue] = useState(selectedDay);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const { tickets, addTicket } = useTickets();
  const [modalMapUrl, setModalMapUrl] = useState<string | null>(null);
  const [items, setItems] = useState([
    { label: "All Events", value: "All" },
    { label: "Today", value: "Today" },
    { label: "This Week", value: "This Week" },
    { label: "This Month", value: "This Month" },
  ]);
  const [categoryItems, setCategoryItems] = useState(EVENT_CATEGORIES);

  const fetchEvents = useCallback(async (category?: string) => {
    const data = await getEvents(category);
    setEvents(data);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchEvents(selectedCategory);
    } finally {
      setRefreshing(false);
    }
  }, [fetchEvents, selectedCategory]);
   useTabRefresh(handleRefresh);

  useEffect(() => {
    fetchEvents(selectedCategory).catch((error) => {
      console.warn("Failed to fetch events:", error);
    });
  }, [fetchEvents, selectedCategory]);

  const eventItems: EventItem[] = useMemo(
    () =>
      events.map((event) => {
        const eventDate = new Date(event.date);
        const isValidDate = !Number.isNaN(eventDate.getTime());
        const dateLabelDate = isValidDate
          ? eventDate.toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "2-digit",
            })
          : "TBD";
        const dateLabelTime = isValidDate
          ? eventDate
              .toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              })
              .replace(" ", "")
          : "";
        const dateLabel = dateLabelTime
          ? `${dateLabelDate} ${dateLabelTime}`
          : dateLabelDate;

        // Format price for display - convert Decimal to currency string
        const priceNum = typeof event.price === 'number' ? event.price : parseFloat(String(event.price)) || 0;
        const formattedPrice = new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
        }).format(priceNum);

        return {
          id: event.id,
          title: event.title,
          description: event.description || "",
          dateLabel,
          dateLabelDate,
          dateLabelTime,
          location: event.location,
          price: formattedPrice,
          category: event.category || "Other",
          eventImageUrl: event.eventImageUrl,
          mapLocation: event.organiser.location ?? event.location,
          date: eventDate,
        };
      }),
    [events]
  );

 const visibleEvents = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setHours(23, 59, 59, 999);

    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay()); // Sunday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    return eventItems.filter((e) => {
      let matchesDate = true;
      const eventDate = e.date;

      if (selectedDay === "Today") {
        matchesDate = eventDate >= startOfToday && eventDate <= endOfToday;
      } else if (selectedDay === "This Week") {
        matchesDate = eventDate >= startOfWeek && eventDate <= endOfWeek;
      } else if (selectedDay === "This Month") {
        matchesDate = eventDate >= startOfMonth && eventDate <= endOfMonth;
      }

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        query.length === 0 ||
        e.title.toLowerCase().includes(query) ||
        e.location.toLowerCase().includes(query);

      return matchesDate && matchesSearch;
    });
  }, [eventItems, selectedDay, searchQuery]);

  const mapUrl = selectedEvent
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        selectedEvent.mapLocation
      )}`
    : "";

  useEffect(() => {
    let cancelled = false;

    if (!selectedEvent) {
      setModalMapUrl(null);
      return;
    }

    getStaticMapUrl(selectedEvent.mapLocation).then((url) => {
      if (!cancelled) {
        setModalMapUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [selectedEvent]);

  const renderEvent = useCallback(({ item: ev }: { item: EventItem }) => (
    <Pressable
      style={styles.eventCard}
      onPress={() => setSelectedEvent(ev)}
    >
      <View style={styles.eventImage}>
        {ev.eventImageUrl ? (
          <Image
            source={{ uri: ev.eventImageUrl }}
            style={styles.eventImageFill}
          />
        ) : (
          <Text style={styles.eventImageText}>image</Text>
        )}
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryBadgeText}>{ev.category}</Text>
        </View>
      </View>

      <View style={styles.eventInfoRow}>
        <View style={styles.eventLeft}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {ev.title}
          </Text>
          <Text style={styles.eventMeta} numberOfLines={1}>
            {ev.dateLabelDate}
          </Text>
          {ev.dateLabelTime ? (
            <Text style={styles.eventMeta} numberOfLines={1}>
              {ev.dateLabelTime}
            </Text>
          ) : null}
        </View>

        <View style={styles.eventRight}>
          <Text style={styles.eventMetaRight} numberOfLines={1}>
            {ev.price}
          </Text>
        </View>
      </View>
    </Pressable>
  ), []);

  const keyExtractor = useCallback((item: EventItem) => item.id, []);

  const renderSectionTitle = useMemo(() => (
    <Text style={styles.sectionTitle}>
      {selectedDay === "All" ? "All events" : selectedDay}
    </Text>
  ), [selectedDay]);


  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FilterBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedValue={value}
        onSelectValue={(val) => {
          setValue(val);
          setSelectedDay(val ?? "All");
        }}
        open={open}
        setOpen={setOpen}
        items={items}
        setItems={setItems}
        placeholder="Filter"
        categoryValue={selectedCategory}
        onSelectCategory={(val) => setSelectedCategory(val ?? "All")}
        categoryOpen={categoryOpen}
        setCategoryOpen={setCategoryOpen}
        categoryItems={categoryItems}
        setCategoryItems={setCategoryItems}
        categoryPlaceholder="Category"
      />

      <FlatList
        data={visibleEvents}
        renderItem={renderEvent}
        keyExtractor={keyExtractor}
        style={styles.scrollArea}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={renderSectionTitle}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={5}
        updateCellsBatchingPeriod={50}
      />
      <Modal
        visible={Boolean(selectedEvent)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedEvent(null)}
        >
          <Pressable style={styles.modalCard} onPress={() => null}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedEvent?.title}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedEvent(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalMeta}>{selectedEvent?.dateLabel}</Text>
            {selectedEvent?.description ? (
              <Text style={styles.modalDescription}>{selectedEvent.description}</Text>
            ) : null}
            <Text style={styles.modalMeta}>{selectedEvent?.location}</Text>
            <Text style={styles.modalMeta}>{selectedEvent?.price}</Text>

            <View style={styles.mapFrame}>
  {modalMapUrl ? (
    <Image source={{ uri: modalMapUrl }} style={styles.mapWebView} />
  ) : (
    <View style={styles.mapFallback}>
      <Text style={styles.eventImageText}>Loading map...</Text>
    </View>
  )}
</View>

            {selectedEvent && (
              <>
                <TouchableOpacity
                  style={styles.openMapBtn}
                  onPress={() => Linking.openURL(mapUrl)}
                >
                  <Text style={styles.openMapText}>Open in Maps</Text>
                </TouchableOpacity>

                {/* booking button */}
                <TouchableOpacity
                  style={[styles.openMapBtn, { marginTop: 8, backgroundColor: colours.primary }]}
                  onPress={async () => {
                    if (!selectedEvent) return;
                    const already = tickets.find((t) => t.id === selectedEvent.id);
                    if (already) {
                      Alert.alert("Already booked", "You already have a ticket for this event.");
                      return;
                    }
                    try {
                      // call backend to create the ticket
                      const response = await purchaseTicket(selectedEvent.id);
                      // add to local cache for immediate UI update
                      const ticket: Ticket = {
                        id: selectedEvent.id,
                        ticketId: response.ticketId,
                        day: selectedEvent.date.toLocaleDateString("en-US", { weekday: "long" }),
                        date: selectedEvent.date.toISOString(),
                        title: selectedEvent.title,
                        dateLabel: selectedEvent.date.toLocaleString(),
                        dateLabelDate: selectedEvent.date.toLocaleDateString(),
                        dateLabelTime: selectedEvent.date.toLocaleTimeString(),
                        location: selectedEvent.location,
                        price: selectedEvent.price,
                        eventImageUrl: selectedEvent.eventImageUrl,
                        mapLocation: selectedEvent.location,
                        used: false,
                        usedAt: null,
                      };
                      await addTicket(ticket);
                      Alert.alert("Ticket added", "Your ticket is now available in My Tickets.");
                      setSelectedEvent(null);
                    } catch (error: any) {
                      Alert.alert("Error", error.message || "Failed to book ticket.");
                    }
                  }}
                >
                  <Text style={[styles.openMapText, { color: "#fff" }]}>Book ticket</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
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

  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colours.textSecondary,
    marginBottom: Spacing.sm,
  },

  eventCard: {
    backgroundColor: colours.surface,
    padding: Spacing.md,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.border,
    shadowColor: "#000",
    shadowOpacity: Platform.OS === "ios" ? 0.12 : 0.32,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4,
    marginBottom: Spacing.sm,
  },

  eventImage: {
    height: 190,
    borderRadius: 18,
    backgroundColor: colours.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    overflow: "hidden",
  },

  eventImageFill: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  eventImageText: {
    color: "rgba(0,0,0,0.55)",
    fontSize: 18,
    fontWeight: "800",
  },

  categoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  categoryBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  eventInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  eventLeft: {
    flex: 1,
    minWidth: 0,
  },

  eventRight: {
    alignItems: "flex-end",
    minWidth: 90,
  },

  eventTitle: {
    color: colours.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },

  eventMeta: {
    color: colours.textPrimary,
    fontSize: 16,
    fontWeight: "900",
  },

  eventMetaRight: {
    color: colours.textPrimary,
    fontSize: 14,
    fontWeight: "800",
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
    fontWeight: "800",
    color: colours.textPrimary,
    flex: 1,
    paddingRight: 12,
  },

  modalMeta: {
    color: colours.textPrimary,
    fontSize: 16,
    marginBottom: 6,
  },

  modalDescription: {
    color: colours.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 6,
  },

  mapFrame: {
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colours.border,
    marginTop: 10,
  },

  mapWebView: {
    flex: 1,
  },

  mapFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  openMapBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colours.primary,
    alignItems: "center",
  },

  openMapText: {
    color: colours.surface,
    fontWeight: "700",
  },
   modalCloseButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colours.primary,
  borderWidth: 1,
  borderColor: colours.border,
},

modalCloseText: {
  fontSize: 18,
  fontWeight: "700",
  color: colours.textPrimary,
},
});