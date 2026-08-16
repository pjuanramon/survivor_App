import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MessageSquare, Send, X, Flame, Skull, Trophy, Sparkles } from 'lucide-react-native';
import { COLORS } from '../../constants/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface ChatMessage {
  id: string;
  league_id: string;
  user_id: string;
  username: string;
  message: string;
  created_at: string;
}

interface LeagueChatModalProps {
  visible: boolean;
  onClose: () => void;
  leagueId: string;
  leagueName: string;
}

export const LeagueChatModal: React.FC<LeagueChatModalProps> = ({
  visible,
  onClose,
  leagueId,
  leagueName,
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible && leagueId) {
      fetchMessages();

      // Subscribe to Supabase Realtime channel for this league
      const channel = supabase
        .channel(`league-chat-${leagueId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sur_league_messages',
            filter: `league_id=eq.${leagueId}`,
          },
          (payload) => {
            const newMsg = payload.new as ChatMessage;
            setMessages((prev) => [...prev, newMsg]);
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [visible, leagueId]);

  async function fetchMessages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sur_league_messages')
        .select('*')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (!error && data) {
        setMessages(data);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }

  async function handleSend() {
    if (!inputMessage.trim() || !user) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');
    setSending(true);

    try {
      const username =
        profile?.username || user.email?.split('@')[0] || 'Jugador';

      const { error } = await supabase.from('sur_league_messages').insert({
        league_id: leagueId,
        user_id: user.id,
        username: username,
        message: textToSend,
      });

      if (error) {
        console.error('Error sending message:', error);
      }
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setSending(false);
    }
  }

  const handleQuickReaction = (reaction: string) => {
    setInputMessage((prev) => `${prev} ${reaction}`.trim());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.chatCard}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerInfo}>
                <MessageSquare size={20} color={COLORS.primary} />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.headerTitle} numberOfLines={1}>
                    Chat de Liga
                  </Text>
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {leagueName}
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <X size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Reactions Bar */}
            <View style={styles.quickReactionsRow}>
              {['🔥', '💀', '⚽', '👏', '😂', '👑'].map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => handleQuickReaction(emoji)}
                  style={styles.quickReactionBtn}
                >
                  <Text style={styles.quickReactionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Messages Area */}
            {loading ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator color={COLORS.primary} size="small" />
              </View>
            ) : messages.length === 0 ? (
              <View style={styles.emptyArea}>
                <MessageSquare size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
                <Text style={styles.emptySub}>
                  ¡Sé el primero en picar a tus amigos o comentar los picks!
                </Text>
              </View>
            ) : (
              <ScrollView
                ref={scrollViewRef}
                style={styles.messagesList}
                contentContainerStyle={styles.messagesContent}
                showsVerticalScrollIndicator={false}
              >
                {messages.map((msg) => {
                  const isMine = msg.user_id === user?.id;
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.messageRow,
                        isMine ? styles.myMessageRow : styles.otherMessageRow,
                      ]}
                    >
                      <View
                        style={[
                          styles.messageBubble,
                          isMine
                            ? styles.myMessageBubble
                            : styles.otherMessageBubble,
                        ]}
                      >
                        {!isMine && (
                          <Text style={styles.senderName}>{msg.username}</Text>
                        )}
                        <Text
                          style={[
                            styles.messageText,
                            isMine
                              ? styles.myMessageText
                              : styles.otherMessageText,
                          ]}
                        >
                          {msg.message}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Input Bar */}
            <View style={styles.inputBar}>
              <TextInput
                style={styles.textInput}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={COLORS.textMuted}
                value={inputMessage}
                onChangeText={setInputMessage}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                maxLength={300}
              />

              <TouchableOpacity
                onPress={handleSend}
                disabled={!inputMessage.trim() || sending}
                style={[
                  styles.sendBtn,
                  !inputMessage.trim() && styles.sendBtnDisabled,
                ]}
              >
                <Send
                  size={18}
                  color={
                    inputMessage.trim() ? COLORS.textInverse : COLORS.textMuted
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    height: '80%',
    maxHeight: 650,
  },
  chatCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surfaceElevated,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  quickReactionsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    gap: 8,
  },
  quickReactionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  },
  quickReactionText: {
    fontSize: 16,
  },
  loadingArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 10,
  },
  messageRow: {
    flexDirection: 'row',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  otherMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  myMessageText: {
    color: COLORS.textInverse,
    fontWeight: '600',
  },
  otherMessageText: {
    color: COLORS.textPrimary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surfaceElevated,
    gap: 10,
  },
  textInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: COLORS.surfaceBorder,
  },
});
