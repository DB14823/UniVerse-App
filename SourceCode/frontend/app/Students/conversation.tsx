import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colours } from "../../lib/theme/colours";
import {
  fetchMessages,
  markConversationRead,
  Message,
  MessageReaction,
} from "../../lib/messagesApi";
import { getSocket } from "../hooks/useSocket";

const EMOJI_OPTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "👏"];

function groupReactions(
  reactions: MessageReaction[],
): { emoji: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const r of reactions) {
    map[r.emoji] = (map[r.emoji] ?? 0) + 1;
  }
  return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
}

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId, otherName, otherStudentId, otherProfileImageUrl } =
    useLocalSearchParams<{
      conversationId: string;
      otherName: string;
      otherStudentId?: string;
      otherProfileImageUrl?: string;
    }>();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const oldestCursorRef = useRef<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // auth.ts stores the current student's ID under the "userId" key in
  // SecureStore (confirmed via clearSession which deletes "userId").
  useEffect(() => {
    SecureStore.getItemAsync("userId").then((id) => {
      if (id) setMyStudentId(id);
    });
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchMessages(conversationId);
      // API returns newest-first; reverse so oldest is at top of the list
      setMessages(data.slice().reverse());
      if (data.length > 0) {
        oldestCursorRef.current = data[data.length - 1].createdAt;
      }
      setHasMore(data.length === 30);
      await markConversationRead(conversationId);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      markConversationRead(conversationId).catch(() => {});
    };

    const onTyping = ({ conversationId: cid }: { conversationId: string }) => {
      if (cid !== conversationId) return;
      setIsOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(
        () => setIsOtherTyping(false),
        3000,
      );
    };

    const onReaction = ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: MessageReaction;
    }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          // Replace any existing reaction from this student with the new one
          const filtered = m.reactions.filter(
            (r) => r.studentId !== reaction.studentId,
          );
          return { ...m, reactions: [...filtered, reaction] };
        }),
      );
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("message_reaction", onReaction);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("message_reaction", onReaction);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("send_message", { conversationId, content: trimmed });
    setText("");
  };

  const onChangeText = (val: string) => {
    setText(val);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      getSocket()?.emit("typing", { conversationId });
    }
  };

  const sendReaction = (messageId: string, emoji: string) => {
    getSocket()?.emit("react_message", { messageId, emoji });
    setSelectedMessageId(null);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !oldestCursorRef.current) return;
    setLoadingMore(true);
    try {
      const older = await fetchMessages(
        conversationId,
        oldestCursorRef.current,
      );
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      const reversed = older.slice().reverse();
      setMessages((prev) => [...reversed, ...prev]);
      oldestCursorRef.current = older[older.length - 1].createdAt;
      setHasMore(older.length === 30);
    } catch {
      // silent — don't crash the UI if history pagination fails
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colours.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={26} color={colours.textPrimary} />
        </Pressable>

        <Pressable
          style={styles.headerCenter}
          onPress={() =>
            otherStudentId &&
            router.push({
              pathname: "/Students/profileStudent",
              params: { userId: otherStudentId },
            } as any)
          }
        >
          <View style={styles.headerAvatar}>
            {otherProfileImageUrl ? (
              <Image
                source={{ uri: otherProfileImageUrl }}
                style={styles.headerAvatarImg}
              />
            ) : (
              <Text style={styles.headerAvatarFallback}>
                {(otherName || "?").charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={styles.headerName} numberOfLines={1}>
            {otherName}
          </Text>
        </Pressable>

        <View style={styles.headerSpacer} />
      </View>

      {/* Message list — oldest at top, newest at bottom */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onScroll={({ nativeEvent }) => {
          if (nativeEvent.contentOffset.y < 80 && hasMore && !loadingMore) {
            loadMore();
          }
        }}
        scrollEventThrottle={200}
        ListHeaderComponent={
          loadingMore ? (
            <ActivityIndicator
              style={{ marginVertical: 8 }}
              color={colours.primary}
            />
          ) : null
        }
        ListFooterComponent={
          isOtherTyping ? (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>•••</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMe = item.senderId === myStudentId;
          const grouped = groupReactions(item.reactions);
          return (
            <View
              style={[
                styles.bubbleWrapper,
                isMe ? styles.bubbleRight : styles.bubbleLeft,
              ]}
            >
              <Pressable
                onLongPress={() => setSelectedMessageId(item.id)}
                style={[
                  styles.bubble,
                  isMe ? styles.bubbleMe : styles.bubbleThem,
                ]}
              >
                <Text
                  style={[
                    styles.bubbleText,
                    isMe ? styles.bubbleTextMe : styles.bubbleTextThem,
                  ]}
                >
                  {item.content}
                </Text>
              </Pressable>
              {grouped.length > 0 && (
                <View style={styles.reactionsRow}>
                  {grouped.map(({ emoji, count }) => (
                    <View key={emoji} style={styles.reactionPill}>
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {count > 1 && (
                        <Text style={styles.reactionCount}>{count}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Emoji picker modal — shown on long-press of a bubble */}
      <Modal
        visible={!!selectedMessageId}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessageId(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectedMessageId(null)}
        >
          <View style={styles.emojiPicker}>
            {EMOJI_OPTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() =>
                  selectedMessageId && sendReaction(selectedMessageId, emoji)
                }
                style={styles.emojiBtn}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder="Message..."
          placeholderTextColor={colours.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit
        />
        <Pressable
          onPress={sendMessage}
          style={styles.sendBtn}
          disabled={!text.trim()}
        >
          <Ionicons
            name="send"
            size={20}
            color={text.trim() ? colours.primary : colours.textMuted}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    gap: 5,
  },
  headerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colours.glass,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colours.border,
  },
  headerAvatarImg: { width: 46, height: 46 },
  headerAvatarFallback: {
    fontSize: 19,
    fontWeight: "700",
    color: colours.primary,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "700",
    color: colours.textPrimary,
    textAlign: "center",
  },
  headerSpacer: { width: 40 },
  listContent: { padding: 12, paddingBottom: 8 },
  bubbleWrapper: { marginBottom: 12 },
  bubbleLeft: { alignItems: "flex-start" },
  bubbleRight: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: {
    backgroundColor: colours.primary,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: colours.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: colours.textPrimary },
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colours.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colours.border,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: colours.textMuted, marginLeft: 3 },
  typingRow: { paddingHorizontal: 16, paddingVertical: 8 },
  typingText: {
    fontSize: 22,
    color: colours.textMuted,
    letterSpacing: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPicker: {
    flexDirection: "row",
    backgroundColor: colours.surface,
    borderRadius: 32,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiBtn: { padding: 4 },
  emoji: { fontSize: 28 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colours.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colours.textPrimary,
    marginRight: 8,
  },
  sendBtn: { padding: 8, marginBottom: 2 },
});
