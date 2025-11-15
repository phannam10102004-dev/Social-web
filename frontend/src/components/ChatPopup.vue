<template>
  <div class="chat-popup" v-if="isVisible" :class="{ minimized: isMinimized }">
    <div class="chat-header" @click="toggleMinimize">
      <div class="chat-user-info">
        <!-- Group Chat Avatar -->
        <div
          v-if="conversation?.isGroup"
          class="chat-avatar group-avatar-wrapper"
        >
          <i class="material-icons">groups</i>
        </div>

        <!-- 1-1 Chat Avatar -->
        <template v-else>
          <img
            v-if="conversation?.participant?.profilePicture"
            :src="
              $buildProfilePictureUrl(conversation.participant.profilePicture)
            "
            alt="Avatar"
            class="chat-avatar"
          />
          <img
            v-else
            src="@/assets/defaultProfile.png"
            alt="Avatar"
            class="chat-avatar"
          />
        </template>

        <div class="chat-user-details">
          <!-- Group Name -->
          <span v-if="conversation?.isGroup" class="chat-user-name">
            <i class="material-icons group-icon-inline">groups</i>
            {{ conversation.groupName }}
          </span>
          <!-- User Name - Clickable -->
          <span
            v-else
            class="chat-user-name clickable-name"
            @click.stop="goToProfile"
            title="Xem trang cá nhân"
          >
            {{
              conversation?.participant?.displayName ||
              conversation?.participant?.email ||
              "Người dùng"
            }}
          </span>

          <!-- Group Members Count -->
          <span v-if="conversation?.isGroup" class="chat-online-status">
            {{ conversation.participants?.length || 0 }} thành viên
          </span>
          <!-- User Online Status -->
          <span
            v-else
            class="chat-online-status"
            v-show="conversation?.participant?.isOnline"
          >
            Đang hoạt động
          </span>
        </div>
      </div>
      <div class="chat-actions">
        <!-- Video Call Button (only for 1-1 chat) -->
        <i
          v-if="!conversation?.isGroup"
          class="material-icons action-btn video-call-btn"
          @click.stop="handleCallButton"
          title="Gọi video"
        >
          videocam
        </i>

        <!-- Group Members Button -->
        <i
          v-if="conversation?.isGroup"
          class="material-icons action-btn"
          @click.stop="showGroupMembers"
          title="Thành viên nhóm"
        >
          people
        </i>

        <i class="material-icons action-btn" @click.stop="toggleMinimize">
          {{ isMinimized ? "expand_less" : "remove" }}
        </i>
        <i class="material-icons action-btn" @click.stop="closeChat">close</i>
      </div>
    </div>

    <div class="chat-body" v-show="!isMinimized">
      <div class="chat-messages" ref="messagesContainer">
        <div v-if="loading" class="chat-loading">
          <div class="loading-spinner"></div>
          <span>Đang tải tin nhắn...</span>
        </div>

        <div v-else-if="messages.length === 0" class="empty-chat">
          <div class="empty-icon">💬</div>
          <p>Chưa có tin nhắn nào</p>
          <p class="empty-hint">Gửi tin nhắn đầu tiên!</p>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="message in messages"
            :key="message._id"
            class="message-wrapper"
            :class="{ 'own-message': isOwnMessage(message) }"
          >
            <img
              v-if="!isOwnMessage(message) && message.sender.profilePicture"
              :src="$buildProfilePictureUrl(message.sender.profilePicture)"
              class="message-avatar"
            />
            <img
              v-else-if="!isOwnMessage(message)"
              src="@/assets/defaultProfile.png"
              class="message-avatar"
            />

            <div class="message-with-reactions">
              <div
                class="message-bubble"
                :class="{ 'own-bubble': isOwnMessage(message) }"
                @mousedown="startLongPress($event, message)"
                @mouseup="cancelLongPress"
                @mouseleave="cancelLongPress"
                @touchstart="startLongPress($event, message)"
                @touchend="cancelLongPress"
              >
                <!-- More Options Button -->
                <button
                  v-if="isOwnMessage(message)"
                  class="message-more-btn"
                  @click.stop.prevent="showContextMenu($event, message)"
                >
                  <i class="material-icons">more_horiz</i>
                </button>

                <div
                  v-if="message.messageType === 'image'"
                  class="message-image"
                >
                  <img :src="$buildAssetUrl(message.file)" alt="Image" />
                </div>
                <div
                  v-else-if="message.messageType === 'file'"
                  class="message-file"
                  @click="downloadFile(message)"
                >
                  <i class="material-icons">attach_file</i>
                  <span>{{ message.originalFileName || message.file }}</span>
                  <i class="material-icons download-icon">download</i>
                </div>
                <p v-else class="message-text">{{ message.content }}</p>
                <span class="message-time">{{
                  formatTime(message.createdAt)
                }}</span>
              </div>

              <!-- Message Reactions Summary - BÊN NGOÀI BUBBLE -->
              <MessageReactionsSummary
                :reactions="getMessageReactions(message)"
                @show-reactors="showMessageReactors(message)"
              />
            </div>
          </div>
          <!-- Anchor element để scroll tới -->
          <div ref="messagesEnd"></div>
        </div>
      </div>

      <div class="chat-input">
        <div class="plus-menu-wrapper">
          <i class="material-icons plus-icon" @click.stop="toggleAttachMenu"
            >add_circle</i
          >

          <!-- Attach Menu -->
          <div v-if="showAttachMenu" class="attach-menu" @click.stop>
            <div class="attach-menu-item" @click="triggerImageInput">
              <i class="material-icons">image</i>
              <span>Ảnh</span>
            </div>
            <div class="attach-menu-item" @click="triggerFileInput">
              <i class="material-icons">attach_file</i>
              <span>File</span>
            </div>
          </div>

          <input
            type="file"
            ref="fileInput"
            accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
            style="display: none"
            @change="handleFileSelect"
          />
          <input
            type="file"
            ref="imageInput"
            accept="image/*"
            style="display: none"
            @change="handleImageSelect"
          />
        </div>

        <input
          type="text"
          v-model="messageInput"
          placeholder="Aa"
          @keydown.enter="sendMessage"
          class="message-input"
          ref="chatInput"
        />

        <i class="material-icons emoji-icon" @click.stop="toggleEmojiPicker"
          >sentiment_satisfied_alt</i
        >
        <i
          class="material-icons send-icon"
          @click="sendMessage"
          :class="{ active: messageInput.trim() }"
        >
          send
        </i>
      </div>
    </div>

    <!-- Emoji Picker Modal -->
    <div
      v-if="showEmojiPicker"
      class="emoji-picker-overlay"
      @click="closeEmojiPicker"
    >
      <div class="emoji-picker-container" @click.stop>
        <div class="emoji-picker-search">
          <i class="material-icons">search</i>
          <input
            v-model="emojiSearch"
            type="text"
            placeholder="Tìm kiếm biểu tượng cảm xúc"
            @input="filterEmojis"
          />
        </div>

        <div class="emoji-categories">
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['category-btn', { active: activeCategory === cat.id }]"
            @click="selectCategory(cat.id)"
            :title="cat.name"
          >
            {{ cat.icon }}
          </button>
        </div>

        <div class="emoji-category-title">
          {{ getCurrentCategoryName() }}
        </div>

        <div class="emoji-grid-container">
          <button
            v-for="emoji in filteredEmojis"
            :key="emoji"
            @click="insertEmoji(emoji)"
            class="emoji-item"
            type="button"
          >
            {{ emoji }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reaction Picker -->
    <MessageReactionPicker
      :show="showReactionPicker"
      :position="reactionPickerPosition"
      :selected-message="selectedMessage"
      :current-user-id="currentUserId"
      @select="handleReactionSelect"
    />

    <!-- Floating Emoji Animation -->
    <transition-group name="float" tag="div" class="floating-emojis">
      <div
        v-for="emoji in floatingEmojis"
        :key="emoji.id"
        class="floating-emoji"
        :style="{ left: emoji.x + 'px', top: emoji.y + 'px' }"
      >
        {{ emoji.emoji }}
      </div>
    </transition-group>

    <!-- Message Reactors Modal -->
    <MessageReactorsModal
      :show="showReactorsModal"
      :reactions="
        selectedMessageForReactors
          ? getMessageReactions(selectedMessageForReactors)
          : []
      "
      @close="showReactorsModal = false"
    />

    <!-- Context Menu -->
    <div
      v-if="showMessageMenu"
      class="message-context-menu"
      :style="{ top: menuPosition.y + 'px', left: menuPosition.x + 'px' }"
      @click.stop
    >
      <div
        class="menu-item"
        @click="editMessage"
        v-if="canEdit(contextMessage)"
      >
        <i class="material-icons">edit</i>
        <span>Sửa</span>
      </div>
      <div class="menu-item delete" @click="confirmDelete">
        <i class="material-icons">delete</i>
        <span>Xóa</span>
      </div>
    </div>

    <!-- Edit Message Modal -->
    <div v-if="showEditModal" class="edit-modal-overlay" @click="cancelEdit">
      <div class="edit-modal" @click.stop>
        <div class="edit-modal-header">
          <h3>Sửa tin nhắn</h3>
          <button @click="cancelEdit" class="close-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="edit-modal-body">
          <textarea
            v-model="editingContent"
            placeholder="Nhập nội dung tin nhắn..."
            ref="editTextarea"
            @keydown.enter.ctrl="saveEdit"
          ></textarea>
        </div>
        <div class="edit-modal-footer">
          <button @click="cancelEdit" class="btn-cancel">Hủy</button>
          <button
            @click="saveEdit"
            class="btn-save"
            :disabled="!editingContent.trim()"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="edit-modal-overlay"
      @click="showDeleteModal = false"
    >
      <div class="edit-modal delete-confirm-modal" @click.stop>
        <div class="edit-modal-header">
          <h3>Xác nhận xóa</h3>
          <button @click="showDeleteModal = false" class="close-btn">
            <i class="material-icons">close</i>
          </button>
        </div>
        <div class="edit-modal-body">
          <p>Bạn có chắc muốn xóa tin nhắn này?</p>
        </div>
        <div class="edit-modal-footer">
          <button @click="showDeleteModal = false" class="btn-cancel">
            Hủy
          </button>
          <button @click="deleteMessage" class="btn-delete">Xóa</button>
        </div>
      </div>
    </div>

    <!-- Group Members Modal -->
    <teleport to="body">
      <GroupMembersModal
        v-if="showMembersModal && conversation?.isGroup"
        :conversation="conversation"
        :current-user-id="currentUserId"
        @close="showMembersModal = false"
        @conversation-refreshed="handleConversationRefreshed"
        @members-updated="handleMembersUpdated"
        @member-removed="handleMemberRemoved"
        @member-promoted="handleMemberPromoted"
        @left-group="handleLeftGroup"
      />
    </teleport>

    <!-- Incoming Call Modal -->
    <teleport to="body">
      <div
        v-if="incomingCall && !isCallModalVisible"
        class="call-overlay incoming"
      >
        <div class="call-modal">
          <div class="call-header">
            <h3>Cuộc gọi đến</h3>
            <p>{{ incomingCall.callerName || "Người dùng" }}</p>
          </div>
          <div class="call-actions">
            <button class="call-btn accept" @click="acceptIncomingCall">
              <i class="material-icons">call</i>
            </button>
            <button class="call-btn reject" @click="rejectIncomingCall">
              <i class="material-icons">call_end</i>
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Active Call Window -->
    <teleport to="body">
      <div v-if="isCallModalVisible" class="call-overlay active">
        <div class="call-window">
          <div class="call-video-container">
            <video
              ref="remoteVideo"
              autoplay
              playsinline
              class="remote-video"
            ></video>
            <video
              ref="localVideo"
              autoplay
              playsinline
              muted
              class="local-video"
            ></video>
          </div>
          <div class="call-controls">
            <button
              class="control-btn"
              :class="{ disabled: !isAudioEnabled }"
              @click="toggleAudio"
              title="Bật/Tắt mic"
            >
              <i class="material-icons">{{
                isAudioEnabled ? "mic" : "mic_off"
              }}</i>
            </button>
            <button
              class="control-btn"
              :class="{ disabled: !isVideoEnabled }"
              @click="toggleVideo"
              title="Bật/Tắt camera"
            >
              <i class="material-icons">{{
                isVideoEnabled ? "videocam" : "videocam_off"
              }}</i>
            </button>
            <button
              class="control-btn end-call"
              @click="endCall"
              title="Kết thúc cuộc gọi"
            >
              <i class="material-icons">call_end</i>
            </button>
          </div>
          <div class="call-status">
            <span>{{ callStatusLabel }}</span>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script>
import MessageAPI from "@/api/messages";
import socketService from "@/services/socketService";
import GroupMembersModal from "./GroupMembersModal.vue";
import MessageReactionPicker from "./MessageReactionPicker.vue";
import MessageReactionsSummary from "./MessageReactionsSummary.vue";
import MessageReactorsModal from "./MessageReactorsModal.vue";

export default {
  name: "ChatPopup",
  components: {
    GroupMembersModal,
    MessageReactionPicker,
    MessageReactionsSummary,
    MessageReactorsModal,
  },
  props: {
    conversation: {
      type: Object,
      required: true,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      isMinimized: false,
      messages: [],
      messageInput: "",
      loading: false,
      selectedFile: null,
      currentUserId: this.$store.state.user?._id,
      showMembersModal: false,
      showReactionPicker: false,
      reactionPickerPosition: { top: 0, left: 0 },
      selectedMessage: null,
      longPressTimer: null,
      longPressDuration: 500,
      floatingEmojis: [],
      lastEvent: null,
      showReactorsModal: false,
      selectedMessageForReactors: null,
      showMessageMenu: false,
      menuPosition: { x: 0, y: 0 },
      contextMessage: null,
      showEditModal: false,
      showDeleteModal: false,
      editingContent: "",
      editingMessageId: null,
      showEmojiPicker: false,
      showAttachMenu: false,
      emojiSearch: "",
      activeCategory: "smileys",
      categories: [
        { id: "smileys", name: "Mặt cười và hình người", icon: "😀" },
        { id: "animals", name: "Động vật và thiên nhiên", icon: "🐻" },
        { id: "food", name: "Đồ ăn và đồ uống", icon: "🍔" },
        { id: "activities", name: "Hoạt động", icon: "⚽" },
        { id: "travel", name: "Du lịch và địa điểm", icon: "🚗" },
        { id: "objects", name: "Đồ vật", icon: "💡" },
        { id: "symbols", name: "Biểu tượng", icon: "❤️" },
        { id: "flags", name: "Cờ", icon: "🏳️" },
      ],
      emojiData: {
        smileys: [
          "😀",
          "😃",
          "😄",
          "😁",
          "😆",
          "😅",
          "🤣",
          "😂",
          "🙂",
          "🙃",
          "😉",
          "😊",
          "😇",
          "🥰",
          "😍",
          "🤩",
          "😘",
          "😗",
          "😚",
          "😙",
          "😋",
          "😛",
          "😜",
          "🤪",
          "😝",
          "🤑",
          "🤗",
          "🤭",
          "🤫",
          "🤔",
          "🤐",
          "🤨",
          "😐",
          "😑",
          "😶",
          "😏",
          "😒",
          "🙄",
          "😬",
          "🤥",
          "😌",
          "😔",
          "😪",
          "🤤",
          "😴",
          "😷",
          "🤒",
          "🤕",
          "🤢",
          "🤮",
          "🤧",
          "🥵",
          "🥶",
          "😶\u200d🌫️",
          "🥴",
          "😵",
          "🤯",
          "🤠",
          "🥳",
          "😎",
          "🤓",
          "🧐",
          "😕",
          "😟",
          "🙁",
          "☹️",
          "😮",
          "😯",
          "😲",
          "😳",
          "🥺",
          "😦",
          "😧",
          "😨",
          "😰",
          "😥",
          "😢",
          "😭",
          "😱",
          "😖",
          "😣",
          "😞",
          "😓",
          "😩",
          "😫",
          "🥱",
          "😤",
          "😡",
          "😠",
          "🤬",
          "😈",
          "👿",
          "💀",
          "☠️",
          "💩",
          "🤡",
          "👹",
          "👺",
          "👻",
          "👽",
          "👾",
          "🤖",
          "😺",
          "😸",
          "😹",
          "😻",
          "😼",
          "😽",
          "🙀",
          "😿",
          "😾",
        ],
        animals: [
          "🐶",
          "🐱",
          "🐭",
          "🐹",
          "🐰",
          "🦊",
          "🐻",
          "🐼",
          "🐨",
          "🐯",
          "🦁",
          "🐮",
          "🐷",
          "🐽",
          "🐸",
          "🐵",
          "🙈",
          "🙉",
          "🙊",
          "🐒",
          "🐔",
          "🐧",
          "🐦",
          "🐤",
          "🐣",
          "🐥",
          "🦆",
          "🦅",
          "🦉",
          "🦇",
          "🐺",
          "🐗",
          "🐴",
          "🦄",
          "🐝",
          "🐛",
          "🦋",
          "🐌",
          "🐞",
          "🐜",
          "🦟",
          "🦗",
          "🕷️",
          "🦂",
          "🐢",
          "🐍",
          "🦎",
          "🦖",
          "🦕",
          "🐙",
          "🦑",
          "🦐",
          "🦞",
          "🦀",
          "🐡",
          "🐠",
          "🐟",
          "🐬",
          "🐳",
          "🐋",
          "🦈",
          "🐊",
          "🐅",
          "🐆",
          "🦓",
          "🦍",
          "🦧",
          "🐘",
          "🦛",
          "🦏",
          "🐪",
          "🐫",
          "🦒",
          "🦘",
          "🐃",
          "🐂",
          "🐄",
          "🐎",
          "🐖",
          "🐏",
          "🐑",
          "🦙",
          "🐐",
          "🦌",
          "🐕",
          "🐩",
          "🦮",
          "🐕\u200d🦺",
          "🐈",
          "🐓",
          "🦃",
          "🦚",
          "🦜",
          "🦢",
          "🦩",
          "🕊️",
          "🐇",
          "🦝",
          "🦨",
          "🦡",
          "🦦",
          "🦥",
          "🐁",
          "🐀",
          "🐿️",
          "🦔",
        ],
        food: [
          "🍇",
          "🍈",
          "🍉",
          "🍊",
          "🍋",
          "🍌",
          "🍍",
          "🥭",
          "🍎",
          "🍏",
          "🍐",
          "🍑",
          "🍒",
          "🍓",
          "🥝",
          "🍅",
          "🥥",
          "🥑",
          "🍆",
          "🥔",
          "🥕",
          "🌽",
          "🌶️",
          "🥒",
          "🥬",
          "🥦",
          "🧄",
          "🧅",
          "🍄",
          "🥜",
          "🌰",
          "🍞",
          "🥐",
          "🥖",
          "🥨",
          "🥯",
          "🥞",
          "🧇",
          "🧀",
          "🍖",
          "🍗",
          "🥩",
          "🥓",
          "🍔",
          "🍟",
          "🍕",
          "🌭",
          "🥪",
          "🌮",
          "🌯",
          "🥙",
          "🧆",
          "🥚",
          "🍳",
          "🥘",
          "🍲",
          "🥣",
          "🥗",
          "🍿",
          "🧈",
          "🧂",
          "🥫",
          "🍱",
          "🍘",
          "🍙",
          "🍚",
          "🍛",
          "🍜",
          "🍝",
          "🍠",
          "🍢",
          "🍣",
          "🍤",
          "🍥",
          "🥮",
          "🍡",
          "🥟",
          "🥠",
          "🥡",
          "🦀",
          "🦞",
          "🦐",
          "🦑",
          "🦪",
          "🍦",
          "🍧",
          "🍨",
          "🍩",
          "🍪",
          "🎂",
          "🍰",
          "🧁",
          "🥧",
          "🍫",
          "🍬",
          "🍭",
          "🍮",
          "🍯",
          "🍼",
          "🥛",
          "☕",
          "🍵",
          "🍶",
          "🍾",
          "🍷",
          "🍸",
          "🍹",
          "🍺",
          "🍻",
          "🥂",
          "🥃",
          "🥤",
          "🧃",
          "🧉",
          "🧊",
        ],
        activities: [
          "⚽",
          "🏀",
          "🏈",
          "⚾",
          "🥎",
          "🎾",
          "🏐",
          "🏉",
          "🥏",
          "🎱",
          "🪀",
          "🏓",
          "🏸",
          "🏒",
          "🏑",
          "🥍",
          "🏏",
          "🥅",
          "⛳",
          "🪁",
          "🏹",
          "🎣",
          "🤿",
          "🥊",
          "🥋",
          "🎽",
          "🛹",
          "🛼",
          "🛷",
          "⛸️",
          "🥌",
          "🎿",
          "⛷️",
          "🏂",
          "🪂",
          "🏋️",
          "🤼",
          "🤸",
          "🤺",
          "⛹️",
          "🤾",
          "🏌️",
          "🏇",
          "🧘",
          "🏊",
          "🤽",
          "🚣",
          "🧗",
          "🚴",
          "🚵",
          "🎪",
          "🎭",
          "🎨",
          "🎬",
          "🎤",
          "🎧",
          "🎼",
          "🎹",
          "🥁",
          "🎷",
          "🎺",
          "🎸",
          "🪕",
          "🎻",
          "🎲",
          "♟️",
          "🎯",
          "🎳",
          "🎮",
          "🎰",
          "🧩",
        ],
        travel: [
          "🚗",
          "🚕",
          "🚙",
          "🚌",
          "🚎",
          "🏎️",
          "🚓",
          "🚑",
          "🚒",
          "🚐",
          "🚚",
          "🚛",
          "🚜",
          "🦯",
          "🦽",
          "🦼",
          "🛴",
          "🚲",
          "🛵",
          "🏍️",
          "🛺",
          "🚨",
          "🚔",
          "🚍",
          "🚘",
          "🚖",
          "🚡",
          "🚠",
          "🚟",
          "🚃",
          "🚋",
          "🚞",
          "🚝",
          "🚄",
          "🚅",
          "🚈",
          "🚂",
          "🚆",
          "🚇",
          "🚊",
          "🚉",
          "✈️",
          "🛫",
          "🛬",
          "🛩️",
          "💺",
          "🛰️",
          "🚀",
          "🛸",
          "🚁",
          "🛶",
          "⛵",
          "🚤",
          "🛥️",
          "🛳️",
          "⛴️",
          "🚢",
          "⚓",
          "⛽",
          "🚧",
          "🚦",
          "🚥",
          "🚏",
          "🗺️",
          "🗿",
          "🗽",
          "🗼",
          "🏰",
          "🏯",
          "🏟️",
          "🎡",
          "🎢",
          "🎠",
          "⛲",
          "⛱️",
          "🏖️",
          "🏝️",
          "🏜️",
          "🌋",
          "⛰️",
          "🏔️",
          "🗻",
          "🏕️",
          "⛺",
          "🏠",
          "🏡",
          "🏘️",
          "🏚️",
          "🏗️",
          "🏭",
          "🏢",
          "🏬",
          "🏣",
          "🏤",
          "🏥",
          "🏦",
          "🏨",
          "🏪",
          "🏫",
          "🏩",
          "💒",
          "🏛️",
          "⛪",
          "🕌",
          "🕍",
          "🛕",
          "🕋",
        ],
        objects: [
          "⌚",
          "📱",
          "📲",
          "💻",
          "⌨️",
          "🖥️",
          "🖨️",
          "🖱️",
          "🖲️",
          "🕹️",
          "🗜️",
          "💾",
          "💿",
          "📀",
          "📼",
          "📷",
          "📸",
          "📹",
          "🎥",
          "📽️",
          "🎞️",
          "📞",
          "☎️",
          "📟",
          "📠",
          "📺",
          "📻",
          "🎙️",
          "🎚️",
          "🎛️",
          "🧭",
          "⏱️",
          "⏲️",
          "⏰",
          "🕰️",
          "⌛",
          "⏳",
          "📡",
          "🔋",
          "🔌",
          "💡",
          "🔦",
          "🕯️",
          "🪔",
          "🧯",
          "🛢️",
          "💸",
          "💵",
          "💴",
          "💶",
          "💷",
          "💰",
          "💳",
          "💎",
          "⚖️",
          "🧰",
          "🔧",
          "🔨",
          "⚒️",
          "🛠️",
          "⛏️",
          "🔩",
          "⚙️",
          "🧱",
          "⛓️",
          "🧲",
          "🔫",
          "💣",
          "🧨",
          "🪓",
          "🔪",
          "🗡️",
          "⚔️",
          "🛡️",
          "🚬",
          "⚰️",
          "⚱️",
          "🏺",
          "🔮",
          "📿",
          "🧿",
          "💈",
          "⚗️",
          "🔭",
          "🔬",
          "🕳️",
          "🩹",
          "🩺",
          "💊",
          "💉",
          "🩸",
          "🧬",
          "🦠",
          "🧫",
          "🧪",
          "🌡️",
          "🧹",
          "🧺",
          "🧻",
          "🚽",
          "🚰",
          "🚿",
          "🛁",
          "🛀",
          "🧼",
          "🪒",
          "🧽",
          "🧴",
          "🛎️",
          "🔑",
          "🗝️",
          "🚪",
          "🪑",
          "🛋️",
          "🛏️",
          "🛌",
          "🧸",
          "🖼️",
          "🛍️",
          "🛒",
          "🎁",
          "🎈",
          "🎏",
          "🎀",
          "🎊",
          "🎉",
          "🎎",
          "🏮",
          "🎐",
          "🧧",
          "✉️",
          "📩",
          "📨",
          "📧",
          "💌",
          "📥",
          "📤",
          "📦",
          "🏷️",
          "📪",
          "📫",
          "📬",
          "📭",
          "📮",
          "📯",
          "📜",
          "📃",
          "📄",
          "📑",
          "🧾",
          "📊",
          "📈",
          "📉",
          "🗒️",
          "🗓️",
          "📆",
          "📅",
          "🗑️",
          "📇",
          "🗃️",
          "🗳️",
          "🗄️",
          "📋",
          "📁",
          "📂",
          "🗂️",
          "🗞️",
          "📰",
          "📓",
          "📔",
          "📒",
          "📕",
          "📗",
          "📘",
          "📙",
          "📚",
          "📖",
          "🔖",
          "🧷",
          "🔗",
          "📎",
          "🖇️",
          "📐",
          "📏",
          "🧮",
          "📌",
          "📍",
          "✂️",
          "🖊️",
          "🖋️",
          "✒️",
          "🖌️",
          "🖍️",
          "📝",
          "✏️",
          "🔍",
          "🔎",
          "🔏",
          "🔐",
          "🔒",
          "🔓",
        ],
        symbols: [
          "❤️",
          "🧡",
          "💛",
          "💚",
          "💙",
          "💜",
          "🖤",
          "🤍",
          "🤎",
          "💔",
          "❣️",
          "💕",
          "💞",
          "💓",
          "💗",
          "💖",
          "💘",
          "💝",
          "💟",
          "☮️",
          "✝️",
          "☪️",
          "🕉️",
          "☸️",
          "✡️",
          "🔯",
          "🕎",
          "☯️",
          "☦️",
          "🛐",
          "⛎",
          "♈",
          "♉",
          "♊",
          "♋",
          "♌",
          "♍",
          "♎",
          "♏",
          "♐",
          "♑",
          "♒",
          "♓",
          "🆔",
          "⚛️",
          "🉑",
          "☢️",
          "☣️",
          "📴",
          "📳",
          "🈶",
          "🈚",
          "🈸",
          "🈺",
          "🈷️",
          "✴️",
          "🆚",
          "💮",
          "🉐",
          "㊙️",
          "㊗️",
          "🈴",
          "🈵",
          "🈹",
          "🈲",
          "🅰️",
          "🅱️",
          "🆎",
          "🆑",
          "🅾️",
          "🆘",
          "❌",
          "⭕",
          "🛑",
          "⛔",
          "📛",
          "🚫",
          "💯",
          "💢",
          "♨️",
          "🚷",
          "🚯",
          "🚳",
          "🚱",
          "🔞",
          "📵",
          "🚭",
          "❗",
          "❕",
          "❓",
          "❔",
          "‼️",
          "⁉️",
          "🔅",
          "🔆",
          "〽️",
          "⚠️",
          "🚸",
          "🔱",
          "⚜️",
          "🔰",
          "♻️",
          "✅",
          "🈯",
          "💹",
          "❇️",
          "✳️",
          "❎",
          "🌐",
          "💠",
          "Ⓜ️",
          "🌀",
          "💤",
          "🏧",
          "🚾",
          "♿",
          "🅿️",
          "🈳",
          "🈂️",
          "🛂",
          "🛃",
          "🛄",
          "🛅",
          "🚹",
          "🚺",
          "🚼",
          "🚻",
          "🚮",
          "🎦",
          "📶",
          "🈁",
          "🔣",
          "ℹ️",
          "🔤",
          "🔡",
          "🔠",
          "🆖",
          "🆗",
          "🆙",
          "🆒",
          "🆕",
          "🆓",
          "0️⃣",
          "1️⃣",
          "2️⃣",
          "3️⃣",
          "4️⃣",
          "5️⃣",
          "6️⃣",
          "7️⃣",
          "8️⃣",
          "9️⃣",
          "🔟",
          "🔢",
          "#️⃣",
          "*️⃣",
          "⏏️",
          "▶️",
          "⏸️",
          "⏯️",
          "⏹️",
          "⏺️",
          "⏭️",
          "⏮️",
          "⏩",
          "⏪",
          "⏫",
          "⏬",
          "◀️",
          "🔼",
          "🔽",
          "➡️",
          "⬅️",
          "⬆️",
          "⬇️",
          "↗️",
          "↘️",
          "↙️",
          "↖️",
          "↕️",
          "↔️",
          "↪️",
          "↩️",
          "⤴️",
          "⤵️",
          "🔀",
          "🔁",
          "🔂",
          "🔄",
          "🔃",
          "🎵",
          "🎶",
          "➕",
          "➖",
          "➗",
          "✖️",
          "♾️",
          "💲",
          "💱",
          "™️",
          "©️",
          "®️",
          "〰️",
          "➰",
          "➿",
          "🔚",
          "🔙",
          "🔛",
          "🔝",
          "🔜",
          "✔️",
          "☑️",
          "🔘",
          "🔴",
          "🟠",
          "🟡",
          "🟢",
          "🔵",
          "🟣",
          "⚫",
          "⚪",
          "🟤",
          "🔺",
          "🔻",
          "🔸",
          "🔹",
          "🔶",
          "🔷",
          "🔳",
          "🔲",
          "▪️",
          "▫️",
          "◾",
          "◽",
          "◼️",
          "◻️",
          "🟥",
          "🟧",
          "🟨",
          "🟩",
          "🟦",
          "🟪",
          "⬛",
          "⬜",
          "🟫",
          "🔈",
          "🔇",
          "🔉",
          "🔊",
          "🔔",
          "🔕",
          "📣",
          "📢",
          "👁️\u200d🗨️",
          "💬",
          "💭",
          "🗯️",
          "♠️",
          "♣️",
          "♥️",
          "♦️",
          "🃏",
          "🎴",
          "🀄",
          "🕐",
          "🕑",
          "🕒",
          "🕓",
          "🕔",
          "🕕",
          "🕖",
          "🕗",
          "🕘",
          "🕙",
          "🕚",
          "🕛",
          "🕜",
          "🕝",
          "🕞",
          "🕟",
          "🕠",
          "🕡",
          "🕢",
          "🕣",
          "🕤",
          "🕥",
          "🕦",
          "🕧",
        ],
        flags: [
          "🏳️",
          "🏴",
          "🏴\u200d☠️",
          "🏁",
          "🚩",
          "🏳️\u200d🌈",
          "🏳️\u200d⚧️",
          "🇻🇳",
          "🇺🇸",
          "🇬🇧",
          "🇫🇷",
          "🇩🇪",
          "🇯🇵",
          "🇰🇷",
          "🇨🇳",
          "🇮🇹",
          "🇪🇸",
          "🇷🇺",
          "🇧🇷",
          "🇦🇺",
          "🇨🇦",
          "🇮🇳",
          "🇲🇽",
          "🇮🇩",
          "🇹🇭",
          "🇸🇬",
          "🇲🇾",
          "🇵🇭",
        ],
      },
      // Video call state
      callStatus: "idle", // idle, calling, ringing, active, ended
      isCallModalVisible: false,
      incomingCall: null,
      peerConnection: null,
      localStream: null,
      remoteStream: null,
      isVideoEnabled: true,
      isAudioEnabled: true,
      callTimeout: null,
      iceQueue: [],
    };
  },
  watch: {
    "conversation._id": {
      handler(newId, oldId) {
        // Leave old conversation
        if (oldId) {
          socketService.leaveConversation(oldId);
        }

        // Load and join new conversation
        if (newId) {
          this.loadMessages();
          socketService.joinConversation(newId);
        }
      },
      immediate: true,
    },
    isMinimized(newVal) {
      // Khi mở rộng popup (từ minimized → expanded)
      if (!newVal) {
        this.markConversationAsRead();

        // Scroll xuống tin nhắn mới nhất khi mở popup
        this.$nextTick(() => {
          setTimeout(() => {
            this.scrollToBottom();
          }, 300);
        });
      }
    },
  },
  mounted() {
    // Đợi một chút để đảm bảo socket đã connect
    this.$nextTick(() => {
      this.setupSocketListeners();

      // Scroll xuống tin nhắn mới nhất khi mở popup lần đầu - tăng delay lên 1s
      setTimeout(() => {
        console.log("🚀 [ChatPopup mounted] Triggering scroll to bottom");
        this.scrollToBottom();
      }, 1000);

      // Thử lại lần nữa để chắc chắn
      setTimeout(() => {
        console.log("🚀 [ChatPopup mounted] 2nd scroll attempt");
        this.scrollToBottom();
      }, 1500);
    });

    // Close menus on click outside
    document.addEventListener("click", this.handleClickOutside);
  },
  beforeUnmount() {
    console.log("🧹 ChatPopup unmounting, cleaning up");

    // Clean up video call
    this.cleanupCall();

    // Clean up socket listeners
    if (this.conversation?._id) {
      socketService.leaveConversation(this.conversation._id);
    }
    socketService.off("newMessage", this.handleNewMessage);
    socketService.off("messageReactionUpdated", this.handleReactionUpdate);

    // Remove click outside listener
    document.removeEventListener("click", this.handleClickOutside);
  },
  methods: {
    setupSocketListeners() {
      console.log(
        "🎧 Setting up socket listeners for conversation:",
        this.conversation._id
      );

      // Kiểm tra socket đã connect chưa
      if (!socketService.getConnectionStatus()) {
        console.warn("⚠️ Socket not connected yet, attempting to connect...");
        socketService.connect();

        // Đợi socket connect xong rồi setup listener
        setTimeout(() => {
          if (socketService.getConnectionStatus()) {
            this.setupAllListeners();
          } else {
            console.error("❌ Socket connection failed");
          }
        }, 1000);
      } else {
        // Socket đã connect, setup listener ngay
        this.setupAllListeners();
      }
    },

    setupAllListeners() {
      // Message listeners
      socketService.onNewMessage(this.handleNewMessage);
      socketService.onMessageReactionUpdated(this.handleReactionUpdate);

      // Listen for messages read updates
      socketService.on("messagesRead", (data) => {
        if (data.conversationId === this.conversation._id) {
          // Update readBy for all affected messages
          data.messages.forEach((updatedMsg) => {
            const msgIndex = this.messages.findIndex(
              (m) => m._id === updatedMsg._id
            );
            if (msgIndex !== -1) {
              this.messages[msgIndex].readBy = updatedMsg.readBy;
            }
          });
        }
      });

      // Video call listeners
      socketService.onIncomingCall((data) => {
        if (data.conversationId === this.conversation._id) {
          this.incomingCall = {
            conversationId: data.conversationId,
            callerId: data.callerId,
            callerName:
              this.conversation?.participant?.displayName || "Người dùng",
            callType: data.callType,
          };
        }
      });

      socketService.onCallAccepted((data) => {
        if (
          data.conversationId === this.conversation._id &&
          this.callStatus === "calling"
        ) {
          this.callStatus = "active";
          if (this.callTimeout) {
            clearTimeout(this.callTimeout);
            this.callTimeout = null;
          }
        }
      });

      socketService.onCallRejected((data) => {
        if (data.conversationId === this.conversation._id) {
          this.handleCallError("Cuộc gọi bị từ chối");
        }
      });

      socketService.onCallCancelled((data) => {
        if (data.conversationId === this.conversation._id) {
          this.incomingCall = null;
          if (this.callStatus === "calling") {
            this.handleCallError("Cuộc gọi đã bị hủy");
          }
        }
      });

      socketService.onCallEnded((data) => {
        if (data.conversationId === this.conversation._id) {
          this.cleanupCall();
        }
      });

      socketService.onCallOffer((data) => {
        if (data.conversationId === this.conversation._id) {
          if (!this.peerConnection && this.isCallModalVisible) {
            // Create peer connection if not exists (for answerer)
            this.createPeerConnectionForAnswer(data.conversationId);
          }

          if (this.peerConnection) {
            this.peerConnection
              .setRemoteDescription(new RTCSessionDescription(data.offer))
              .then(() => {
                // Process queued ICE candidates
                this.iceQueue.forEach((candidate) => {
                  this.peerConnection
                    .addIceCandidate(new RTCIceCandidate(candidate))
                    .catch((error) => {
                      console.error(
                        "[VideoCall] Error adding queued ICE candidate:",
                        error
                      );
                    });
                });
                this.iceQueue = [];

                return this.peerConnection.createAnswer();
              })
              .then((answer) => {
                return this.peerConnection.setLocalDescription(answer);
              })
              .then(() => {
                socketService.sendAnswer(
                  this.conversation._id,
                  this.peerConnection.localDescription
                );
              })
              .catch((error) => {
                console.error("[VideoCall] Error handling offer:", error);
              });
          }
        }
      });

      socketService.onCallAnswer((data) => {
        if (
          data.conversationId === this.conversation._id &&
          this.peerConnection
        ) {
          this.peerConnection
            .setRemoteDescription(new RTCSessionDescription(data.answer))
            .then(() => {
              // Process queued ICE candidates
              this.iceQueue.forEach((candidate) => {
                this.peerConnection
                  .addIceCandidate(new RTCIceCandidate(candidate))
                  .catch((error) => {
                    console.error(
                      "[VideoCall] Error adding queued ICE candidate:",
                      error
                    );
                  });
              });
              this.iceQueue = [];
            })
            .catch((error) => {
              console.error(
                "[VideoCall] Error setting remote description:",
                error
              );
            });
        }
      });

      socketService.onIceCandidate((data) => {
        if (
          data.conversationId === this.conversation._id &&
          this.peerConnection
        ) {
          if (this.peerConnection.remoteDescription) {
            this.peerConnection
              .addIceCandidate(new RTCIceCandidate(data.candidate))
              .catch((error) => {
                console.error("[VideoCall] Error adding ICE candidate:", error);
              });
          } else {
            // Queue ICE candidates if remote description not set yet
            this.iceQueue.push(data.candidate);
          }
        }
      });
    },

    handleReactionUpdate(data) {
      console.log("👍 Reaction update received:", data);
      const { messageId, reactions, userId } = data;

      console.log(
        "🔍 [Frontend] Raw reactions from socket:",
        JSON.stringify(reactions, null, 2)
      );

      // Find and update message
      const message = this.messages.find((m) => m._id === messageId);
      if (message) {
        // Convert backend format to frontend format
        message.reactions = reactions.map((r) => {
          const user = r.user || {};
          console.log("🔍 [Frontend] Processing user:", user);
          const userName =
            user.displayName ||
            (user.email ? user.email.split("@")[0] : null) ||
            "Unknown User";

          console.log("🔍 [Frontend] Mapped userName:", userName);

          return {
            userId: user._id || r.user,
            userName: userName,
            userAvatar: user.profilePicture || null,
            emoji: r.emoji,
          };
        });

        console.log(
          "🔍 [Frontend] Final message.reactions:",
          message.reactions
        );

        // Show floating emoji if someone else reacted
        if (userId && userId !== this.currentUserId) {
          const userReaction = reactions.find(
            (r) => (r.user?._id || r.user) === userId
          );
          if (userReaction) {
            this.createFloatingEmoji(userReaction.emoji, null);
          }
        }
      }
    },

    handleNewMessage(data) {
      // Normalize data structure
      let message, conversationId;

      // Preferred format: { conversationId: 'xxx', message: {...} }
      if (data.conversationId && data.message) {
        message = data.message;
        conversationId = data.conversationId;
      }
      // Legacy format: message sent directly (with conversation field)
      else if (data._id) {
        message = data;
        conversationId = data.conversation || data.conversationId;
      }
      // Invalid format
      else {
        console.error("❌ Invalid message data received:", data);
        return;
      }

      // Validate message structure
      if (!message || !message._id) {
        console.error("❌ Invalid message structure:", message);
        return;
      }

      // Chỉ xử lý tin nhắn thuộc conversation hiện tại
      if (conversationId !== this.conversation._id) {
        return;
      }

      // Kiểm tra tin nhắn đã tồn tại chưa (tránh duplicate)
      const exists = this.messages.some((m) => m && m._id === message._id);
      if (exists) {
        return;
      }

      // Kiểm tra nếu đây là tin nhắn của chính mình (đã có từ optimistic update)
      const isSentByMe =
        message.sender?._id?.toString() === this.currentUserId?.toString();
      if (isSentByMe) {
        // Kiểm tra xem có tin nhắn temp nào không
        const tempIndex = this.messages.findIndex((m) => m && m.isTemp);
        if (tempIndex !== -1) {
          // Thay tin nhắn temp bằng tin nhắn thật
          this.messages.splice(tempIndex, 1, message);

          // Scroll to bottom
          this.$nextTick(() => {
            this.scrollToBottom();
          });
          return;
        }
      }

      // Đảm bảo message có sender đầy đủ
      if (!message.sender || typeof message.sender === "string") {
        // Nếu sender là string hoặc không tồn tại, tạo object sender
        const currentUser = this.$store.state.user;
        const senderId = message.sender || message.sender?._id;

        message.sender = {
          _id: senderId,
          displayName:
            senderId === currentUser._id ? currentUser.displayName : "Unknown",
          profilePicture:
            senderId === currentUser._id ? currentUser.profilePicture : null,
        };
      } else if (!message.sender.displayName || !message.sender._id) {
        // Sender là object nhưng thiếu thông tin
        const currentUser = this.$store.state.user;
        message.sender._id = message.sender._id || currentUser._id;
        message.sender.displayName =
          message.sender.displayName || currentUser.displayName;
        message.sender.profilePicture =
          message.sender.profilePicture || currentUser.profilePicture;
      }

      // Đảm bảo message có readBy
      if (!message.readBy) {
        message.readBy = [];
      }

      // Thêm tin nhắn mới vào danh sách
      this.messages.push(message);

      // Scroll to bottom
      this.$nextTick(() => {
        this.scrollToBottom();
      });

      // Đánh dấu đã đọc nếu popup đang mở
      if (!this.isMinimized) {
        this.markConversationAsRead();
      }
    },

    async markConversationAsRead() {
      try {
        await MessageAPI.markAsRead(this.conversation._id);
        // Cập nhật lại store để refresh unread count
        this.$store.dispatch("loadConversations");
      } catch (error) {
        console.error("Mark as read error:", error);
      }
    },

    async loadMessages() {
      if (!this.conversation?._id) return;

      this.loading = true;
      try {
        const response = await MessageAPI.getMessages(this.conversation._id);
        if (response.status === 200) {
          // Map messages với reactions đúng format
          this.messages = (response.data.messages || []).map((msg) => ({
            ...msg,
            reactions: (msg.reactions || []).map((r) => {
              const user = r.user || {};
              const userName =
                user.displayName ||
                (user.email ? user.email.split("@")[0] : null) ||
                "Unknown User";

              return {
                userId: user._id || r.user,
                userName: userName,
                userAvatar: user.profilePicture || null,
                emoji: r.emoji,
              };
            }),
          }));

          // Scroll to bottom sau khi load - với nhiều lần thử
          this.$nextTick(() => {
            console.log("🔄 [loadMessages] Messages loaded, scrolling...");
            this.scrollToBottom();

            // Thử lại sau 300ms để đảm bảo DOM render xong
            setTimeout(() => {
              console.log("🔄 [loadMessages] 2nd scroll attempt");
              this.scrollToBottom();
            }, 300);

            // Thử lại lần cuối sau 600ms
            setTimeout(() => {
              console.log("🔄 [loadMessages] Final scroll attempt");
              this.scrollToBottom();
            }, 600);
          });
        }

        // Đánh dấu đã đọc ngay khi load messages
        await this.markConversationAsRead();
      } catch (error) {
        console.error("Load messages error:", error);
      } finally {
        this.loading = false;
      }
    },

    async sendMessage() {
      if (!this.messageInput.trim() && !this.selectedFile) return;

      const currentUser = this.$store.state.user;
      const tempMessageContent = this.messageInput.trim();
      const tempFile = this.selectedFile;

      // Clear input ngay lập tức để UX mượt hơn
      this.messageInput = "";
      this.selectedFile = null;

      try {
        const messageData = {
          content: tempMessageContent,
          messageType: tempFile
            ? tempFile.type.startsWith("image/")
              ? "image"
              : "file"
            : "text",
          file: tempFile,
        };

        // Tạo tin nhắn tạm thời để hiển thị ngay
        const tempMessage = {
          _id: "temp-" + Date.now(),
          content: tempMessageContent,
          messageType: messageData.messageType,
          file: tempFile ? tempFile.name : null,
          originalFileName: tempFile ? tempFile.name : null,
          sender: {
            _id: currentUser._id,
            displayName: currentUser.displayName,
            profilePicture: currentUser.profilePicture,
          },
          readBy: [{ user: currentUser._id }],
          createdAt: new Date().toISOString(),
          isTemp: true,
        };

        // Thêm tin nhắn tạm vào danh sách
        this.messages.push(tempMessage);

        // Scroll ngay lập tức
        this.$nextTick(() => {
          this.scrollToBottom();
        });

        const response = await MessageAPI.sendMessage(
          this.conversation._id,
          messageData
        );

        if (response.status === 200 || response.status === 201) {
          // Socket sẽ tự động thêm tin nhắn qua handleNewMessage
          // Chỉ cần xóa temp message
          const tempIndex = this.messages.findIndex(
            (m) => m._id === tempMessage._id
          );
          if (tempIndex !== -1) {
            this.messages.splice(tempIndex, 1);
          }

          // Nếu socket chưa thêm (chậm), thêm thủ công
          const socketAdded = this.messages.some(
            (m) => m._id === response.data._id
          );
          if (!socketAdded) {
            const newMessage = {
              ...response.data,
              sender: response.data.sender || {
                _id: currentUser._id,
                displayName: currentUser.displayName,
                profilePicture: currentUser.profilePicture,
              },
            };

            this.messages.push(newMessage);

            // Scroll lại sau khi thêm tin nhắn thật
            this.$nextTick(() => {
              this.scrollToBottom();
            });
          }

          // Cập nhật store
          this.$store.dispatch("loadConversations");
        }
      } catch (error) {
        console.error("Send message error:", error);
        // Xóa tin nhắn tạm nếu gửi thất bại
        const tempIndex = this.messages.findIndex((m) => m.isTemp);
        if (tempIndex !== -1) {
          this.messages.splice(tempIndex, 1);
        }
        // Khôi phục input nếu gửi thất bại
        this.messageInput = tempMessageContent;
        this.selectedFile = tempFile;
      }
    },

    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
    },

    closeChat() {
      this.$emit("close");
    },

    // GROUP CHAT METHODS
    showGroupMembers() {
      this.showMembersModal = true;
    },

    handleConversationRefreshed(updatedConversation) {
      console.log("🔄 [ChatPopup] Conversation refreshed, updating...");
      // Update the local conversation object - but since it's a prop, we need to emit to parent
      this.$emit("conversation-updated", updatedConversation);
    },

    async handleMembersUpdated(updatedConversation) {
      // Cập nhật conversation với thông tin mới
      this.$emit("conversation-updated", updatedConversation);
      await this.$store.dispatch("loadConversations");
    },

    async handleMemberRemoved(memberId) {
      // Reload conversation để cập nhật danh sách members
      await this.$store.dispatch("loadConversations");

      // Nếu user hiện tại bị xóa, đóng chat
      if (memberId === this.currentUserId) {
        this.closeChat();
      }
    },

    async handleMemberPromoted(memberId) {
      // Reload conversation để cập nhật admins
      await this.$store.dispatch("loadConversations");
    },

    handleLeftGroup() {
      // Đóng chat và reload conversations
      this.$store.dispatch("loadConversations");
      this.closeChat();
    },

    goToProfile() {
      // Chỉ cho phép đi đến profile nếu không phải group chat
      if (this.conversation?.isGroup) return;

      const userId = this.conversation?.participant?._id;
      if (userId) {
        // Điều hướng đến trang profile
        this.$router.push(`/profile/${userId}`);
      }
    },

    scrollToBottom() {
      console.log("📜 [ChatPopup] Scrolling to bottom...");

      // Dùng messagesContainer với scrollTop
      if (this.$refs.messagesContainer) {
        const container = this.$refs.messagesContainer;
        console.log(
          "✅ Using messagesContainer ref, scrollHeight:",
          container.scrollHeight,
          "clientHeight:",
          container.clientHeight
        );

        // Force reflow để đảm bảo layout đã hoàn thành
        void container.offsetHeight;

        // Dùng requestAnimationFrame để scroll sau khi browser paint
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight;
          console.log("📍 [RAF] Scrolled to:", container.scrollTop);

          // Double check sau 50ms
          setTimeout(() => {
            container.scrollTop = container.scrollHeight;
            console.log("📍 [Timeout] Final scroll to:", container.scrollTop);
          }, 50);
        });
      }

      // Fallback: Sử dụng messagesEnd anchor
      if (this.$refs.messagesEnd) {
        console.log("✅ Also using messagesEnd ref");
        this.$refs.messagesEnd.scrollIntoView({
          behavior: "instant",
          block: "end",
        });
      }
    },

    isOwnMessage(message) {
      if (!message || !message.sender || !this.currentUserId) return false;

      const senderId = message.sender._id || message.sender;
      const currentId = this.currentUserId;

      // So sánh cả dạng string và object
      return senderId?.toString() === currentId?.toString();
    },

    triggerFileInput() {
      this.$refs.fileInput.click();
    },

    triggerImageInput() {
      this.$refs.imageInput.click();
    },

    // Reaction Methods
    startLongPress(event, message) {
      if (!message) return;

      // Prevent text selection
      event.preventDefault();

      this.selectedMessage = message;
      this.lastEvent = event; // Save event for floating animation

      this.longPressTimer = setTimeout(() => {
        this.showReactionPickerAtPosition(event);
      }, this.longPressDuration);
    },

    cancelLongPress() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    },

    showReactionPickerAtPosition(event) {
      const rect = event.target
        .closest(".message-bubble")
        .getBoundingClientRect();
      this.reactionPickerPosition = {
        top: rect.top - 60,
        left: rect.left + rect.width / 2 - 130,
      };
      this.showReactionPicker = true;

      // Delay adding click outside listener to prevent immediate close
      setTimeout(() => {
        document.addEventListener("click", this.handleClickOutside);
      }, 100);
    },

    handleClickOutside(event) {
      if (this.showReactionPicker) {
        const picker = document.querySelector(".reaction-picker");
        const messageBubble = event.target.closest(".message-bubble");
        const isClickInsidePicker = picker && picker.contains(event.target);

        // Chỉ đóng khi click bên ngoài cả picker VÀ message bubble
        if (!isClickInsidePicker && !messageBubble) {
          this.showReactionPicker = false;
          this.selectedMessage = null;
          document.removeEventListener("click", this.handleClickOutside);
        }
      }
    },

    handleReactionSelect(emoji) {
      if (this.selectedMessage) {
        // Check if user already reacted with this emoji
        const currentUserId = this.currentUserId;
        const existingReaction = this.selectedMessage.reactions?.find(
          (r) => r.userId === currentUserId
        );
        const newReaction = existingReaction?.emoji === emoji ? null : emoji;

        this.applyReaction(this.selectedMessage, newReaction);
      }
      this.showReactionPicker = false;
      this.selectedMessage = null;
      document.removeEventListener("click", this.handleClickOutside);
    },

    applyReaction(message, reaction) {
      // Create floating emoji animation
      if (reaction) {
        this.createFloatingEmoji(reaction, this.lastEvent);
      }

      // Update local message object immediately for instant feedback
      if (!message.reactions) {
        message.reactions = [];
      }

      const currentUserId = this.currentUserId;
      const currentUser = this.$store?.state?.user;
      const existingReactionIndex = message.reactions.findIndex(
        (r) => r.userId === currentUserId
      );

      if (reaction) {
        // Add or update reaction
        const reactionObj = {
          userId: currentUserId,
          userName: currentUser?.displayName || currentUser?.email || "Bạn",
          userAvatar: currentUser?.profilePicture || null,
          emoji: reaction,
        };

        if (existingReactionIndex !== -1) {
          // Update existing - Vue 3 auto tracks
          message.reactions[existingReactionIndex] = reactionObj;
        } else {
          // Add new
          message.reactions.push(reactionObj);
        }
      } else {
        // Remove reaction
        if (existingReactionIndex !== -1) {
          message.reactions.splice(existingReactionIndex, 1);
        }
      }

      // Call API to save reaction to database
      MessageAPI.addReaction(message._id, reaction)
        .then((response) => {
          console.log("Reaction saved:", response.data);
        })
        .catch((error) => {
          console.error("Failed to save reaction:", error);
          // Rollback on error
          if (reaction) {
            const idx = message.reactions.findIndex(
              (r) => r.userId === currentUserId
            );
            if (idx !== -1) message.reactions.splice(idx, 1);
          }
        });

      console.log("Applied reaction:", reaction, "to message:", message._id);
      console.log("Reactions after:", message.reactions);
    },

    createFloatingEmoji(emoji, clickEvent) {
      const id = Date.now() + Math.random();
      const floatingEmoji = {
        id,
        emoji,
        x: clickEvent ? clickEvent.clientX : window.innerWidth / 2,
        y: clickEvent ? clickEvent.clientY : window.innerHeight / 2,
      };

      this.floatingEmojis.push(floatingEmoji);

      // Remove after animation completes
      setTimeout(() => {
        const index = this.floatingEmojis.findIndex((e) => e.id === id);
        if (index !== -1) {
          this.floatingEmojis.splice(index, 1);
        }
      }, 1000);
    },

    getMessageReactions(message) {
      if (!message.reactions || message.reactions.length === 0) {
        return [];
      }

      // Convert backend format to frontend format if needed
      return message.reactions.map((r) => {
        // Backend format: { user: {_id, displayName, profilePicture}, emoji }
        // Frontend format: { userId, userName, userAvatar, emoji }
        if (r.user && typeof r.user === "object") {
          return {
            userId: r.user._id,
            userName: r.user.displayName || r.user.email || "Unknown",
            userAvatar: r.user.profilePicture || null,
            emoji: r.emoji,
          };
        }
        // Already in frontend format
        return r;
      });
    },

    showMessageReactors(message) {
      this.selectedMessageForReactors = message;
      this.showReactorsModal = true;
    },

    handleFileSelect(event) {
      this.selectedFile = event.target.files[0];
      if (this.selectedFile) {
        this.sendMessage();
      }
    },

    handleImageSelect(event) {
      this.selectedFile = event.target.files[0];
      if (this.selectedFile) {
        this.sendMessage();
      }
    },

    downloadFile(message) {
      if (!message.file) return;

      const token = localStorage.getItem("token");
      const filename = message.file;
      const downloadUrl = `http://localhost:3000/api/messages/download/${filename}`;

      // Add auth header via fetch and blob
      fetch(downloadUrl, {
        headers: { token },
      })
        .then((response) => response.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = message.originalFileName || message.file;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        })
        .catch((error) => {
          console.error("Download error:", error);
          this.showErrorMessage("Không thể tải file");
        });
    },

    formatTime(timestamp) {
      if (!timestamp) return "";

      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${hours}:${minutes}`;
    },

    showContextMenu(event, message) {
      if (!this.isOwnMessage(message)) return;

      this.contextMessage = message;

      // Calculate position to prevent menu from going off-screen
      const menuWidth = 150;
      const menuHeight = 100;
      let x = event.clientX;
      let y = event.clientY;

      // If too close to right edge, position menu to the left
      if (x + menuWidth > window.innerWidth) {
        x = event.clientX - menuWidth;
      }

      // If too close to bottom, position menu above
      if (y + menuHeight > window.innerHeight) {
        y = event.clientY - menuHeight;
      }

      this.menuPosition = { x, y };
      this.showMessageMenu = true;

      const closeMenu = () => {
        this.showMessageMenu = false;
        document.removeEventListener("click", closeMenu);
      };
      setTimeout(() => {
        document.addEventListener("click", closeMenu);
      }, 0);
    },

    canEdit(message) {
      if (!message || message.messageType !== "text") return false;
      if (message.readBy && message.readBy.length > 1) return false;
      return true;
    },

    editMessage() {
      this.showMessageMenu = false;
      this.editingMessageId = this.contextMessage._id;
      this.editingContent = this.contextMessage.content || "";
      this.showEditModal = true;

      this.$nextTick(() => {
        if (this.$refs.editTextarea) {
          this.$refs.editTextarea.focus();
        }
      });
    },

    cancelEdit() {
      this.showEditModal = false;
      this.editingContent = "";
      this.editingMessageId = null;
    },

    async saveEdit() {
      if (!this.editingContent.trim() || !this.editingMessageId) return;

      try {
        await MessageAPI.editMessage(
          this.editingMessageId,
          this.editingContent.trim()
        );

        const messageIndex = this.messages.findIndex(
          (m) => m._id === this.editingMessageId
        );
        if (messageIndex !== -1) {
          this.messages[messageIndex].content = this.editingContent.trim();
          this.messages[messageIndex].isEdited = true;
        }

        this.cancelEdit();
      } catch (error) {
        console.error("Edit message error:", error);
        // Show error in a better way
        this.showErrorMessage(
          error.response?.data?.error || "Không thể sửa tin nhắn"
        );
      }
    },

    confirmDelete() {
      this.showMessageMenu = false;
      this.showDeleteModal = true;
    },

    async deleteMessage() {
      if (!this.contextMessage) return;

      try {
        await MessageAPI.deleteMessage(this.contextMessage._id);

        const messageIndex = this.messages.findIndex(
          (m) => m._id === this.contextMessage._id
        );
        if (messageIndex !== -1) {
          this.messages.splice(messageIndex, 1);
        }

        this.showDeleteModal = false;
      } catch (error) {
        console.error("Delete message error:", error);
        this.showErrorMessage("Không thể xóa tin nhắn");
        this.showDeleteModal = false;
      }
    },

    showErrorMessage(message) {
      // Simple error display - can be enhanced with toast/snackbar later
      console.error(message);
      // Could emit to parent or show in modal
    },

    toggleEmojiPicker() {
      this.showEmojiPicker = !this.showEmojiPicker;
      if (!this.showEmojiPicker) {
        this.emojiSearch = "";
      }
      if (this.showEmojiPicker) {
        this.showAttachMenu = false;
      }
    },

    closeEmojiPicker() {
      this.showEmojiPicker = false;
      this.emojiSearch = "";
    },

    toggleAttachMenu() {
      this.showAttachMenu = !this.showAttachMenu;
      if (this.showAttachMenu) {
        this.showEmojiPicker = false;
      }
    },

    handleClickOutside(event) {
      const target = event.target;
      const clickedInsidePopup = this.$el && this.$el.contains(target);

      if (!clickedInsidePopup) {
        this.showAttachMenu = false;
      }
    },

    insertEmoji(emoji) {
      const input = this.$refs.chatInput;
      const start = input.selectionStart;
      const end = input.selectionEnd;

      this.messageInput =
        this.messageInput.substring(0, start) +
        emoji +
        this.messageInput.substring(end);

      this.$nextTick(() => {
        input.focus();
        const newPos = start + emoji.length;
        input.setSelectionRange(newPos, newPos);
      });
    },

    selectCategory(categoryId) {
      this.activeCategory = categoryId;
      this.emojiSearch = "";
    },

    filterEmojis() {
      // Trigger computed property update
    },

    getCurrentCategoryName() {
      const category = this.categories.find(
        (c) => c.id === this.activeCategory
      );
      return category ? category.name : "";
    },

    // VIDEO CALL METHODS
    async handleCallButton() {
      if (this.conversation?.isGroup) return;
      if (!this.conversation?._id) return;

      try {
        this.callStatus = "calling";
        this.isCallModalVisible = true;

        // Request call via socket
        socketService.requestCall(this.conversation._id, "video");

        // Prepare local stream
        await this.prepareLocalStream();

        // Create peer connection
        this.createPeerConnection();

        // Set timeout for call
        this.callTimeout = setTimeout(() => {
          if (this.callStatus === "calling") {
            this.handleCallError("Không có phản hồi từ người dùng");
          }
        }, 30000); // 30 seconds timeout
      } catch (error) {
        console.error("[VideoCall] Error initiating call:", error);
        this.handleCallError("Không thể khởi tạo cuộc gọi");
      }
    },

    async prepareLocalStream() {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (this.$refs.localVideo) {
          this.$refs.localVideo.srcObject = this.localStream;
        }
      } catch (error) {
        console.error("[VideoCall] prepareLocalStream error:", error);
        throw error;
      }
    },

    createPeerConnection() {
      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };

      this.peerConnection = new RTCPeerConnection(configuration);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendIceCandidate(
            this.conversation._id,
            event.candidate
          );
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.$refs.remoteVideo) {
          this.$refs.remoteVideo.srcObject = this.remoteStream;
        }
      };

      // Create and send offer
      this.peerConnection
        .createOffer()
        .then((offer) => {
          return this.peerConnection.setLocalDescription(offer);
        })
        .then(() => {
          socketService.sendOffer(
            this.conversation._id,
            this.peerConnection.localDescription
          );
        })
        .catch((error) => {
          console.error("[VideoCall] Error creating offer:", error);
          this.handleCallError("Không thể tạo offer");
        });
    },

    async acceptIncomingCall() {
      if (!this.incomingCall) return;

      const conversationId = this.incomingCall.conversationId;

      try {
        this.callStatus = "active";
        this.isCallModalVisible = true;

        // Prepare local stream
        await this.prepareLocalStream();

        // Create peer connection
        this.createPeerConnectionForAnswer(conversationId);

        // Accept call via socket
        socketService.acceptCall(conversationId);

        this.incomingCall = null;
      } catch (error) {
        console.error("[VideoCall] acceptIncomingCall error:", error);
        this.handleCallError("Không thể tham gia cuộc gọi");
      }
    },

    createPeerConnectionForAnswer(conversationId) {
      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };

      this.peerConnection = new RTCPeerConnection(configuration);

      // Add local stream tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          this.peerConnection.addTrack(track, this.localStream);
        });
      }

      // Handle ICE candidates
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socketService.sendIceCandidate(conversationId, event.candidate);
        }
      };

      // Handle remote stream
      this.peerConnection.ontrack = (event) => {
        this.remoteStream = event.streams[0];
        if (this.$refs.remoteVideo) {
          this.$refs.remoteVideo.srcObject = this.remoteStream;
        }
      };
    },

    rejectIncomingCall() {
      if (this.incomingCall) {
        socketService.rejectCall(this.incomingCall.conversationId);
        this.incomingCall = null;
        this.callStatus = "idle";
      }
    },

    endCall() {
      if (this.conversation?._id) {
        socketService.endCall(this.conversation._id);
      }
      this.cleanupCall();
    },

    cleanupCall() {
      // Clear timeout
      if (this.callTimeout) {
        clearTimeout(this.callTimeout);
        this.callTimeout = null;
      }

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      // Clear video elements
      if (this.$refs.localVideo) {
        this.$refs.localVideo.srcObject = null;
      }
      if (this.$refs.remoteVideo) {
        this.$refs.remoteVideo.srcObject = null;
      }

      // Reset state
      this.callStatus = "idle";
      this.isCallModalVisible = false;
      this.incomingCall = null;
      this.remoteStream = null;
      this.iceQueue = [];
    },

    toggleAudio() {
      if (this.localStream) {
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled;
          this.isAudioEnabled = audioTrack.enabled;
        }
      }
    },

    toggleVideo() {
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled;
          this.isVideoEnabled = videoTrack.enabled;
        }
      }
    },

    handleCallError(message) {
      console.error("[VideoCall]", message);
      this.cleanupCall();
      // Could show error toast here
    },
  },

  computed: {
    filteredEmojis() {
      const search = this.emojiSearch.trim().toLowerCase();

      if (!search) {
        // No search, return current category
        return this.emojiData[this.activeCategory] || [];
      }

      // Search by category name
      const matchedCategories = this.categories.filter((cat) =>
        cat.name.toLowerCase().includes(search)
      );

      if (matchedCategories.length > 0) {
        // Return emojis from all matched categories
        return matchedCategories.flatMap((cat) => this.emojiData[cat.id] || []);
      }

      // If no category match, return current category
      return this.emojiData[this.activeCategory] || [];
    },
    callStatusLabel() {
      const statusMap = {
        idle: "",
        calling: "Đang gọi...",
        ringing: "Đang đổ chuông...",
        active: "Đang gọi",
        ended: "Cuộc gọi đã kết thúc",
      };
      return statusMap[this.callStatus] || "";
    },
  },
};
</script>

<style scoped>
.chat-popup {
  position: fixed;
  bottom: 0;
  right: 80px;
  width: 328px;
  height: 455px;
  background: white;
  border-radius: 12px 12px 0 0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 9999;
  transition: height 0.3s ease;
}

.chat-popup.minimized {
  height: 56px;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
  cursor: pointer;
  user-select: none;
}

.chat-user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.chat-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid white;
  flex-shrink: 0;
}

/* Group Avatar Styles */
.group-avatar-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid white;
  flex-shrink: 0;
}

.group-avatar-wrapper i {
  color: white;
  font-size: 20px;
}

.group-icon-inline {
  font-size: 16px !important;
  vertical-align: middle;
  margin-right: 4px;
}

.chat-user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-user-name {
  font-weight: 600;
  font-size: 0.9375rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clickable-name {
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px 6px;
  margin: -2px -6px;
  border-radius: 4px;
}

.clickable-name:hover {
  background: rgba(255, 255, 255, 0.2);
  text-decoration: underline;
}

.chat-online-status {
  font-size: 0.75rem;
  opacity: 0.9;
}

.chat-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  font-size: 20px;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.chat-body {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  background: #f8f9fa;
}

.chat-messages::-webkit-scrollbar {
  width: 6px;
}

.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}

.chat-messages::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 3px;
}

.chat-loading,
.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #718096;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 3rem;
  opacity: 0.5;
}

.empty-hint {
  font-size: 0.8125rem;
  color: #a0aec0;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid #e2e8f0;
  border-top-color: #667eea;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.message-wrapper.own-message {
  flex-direction: row-reverse;
}

.message-with-reactions {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 75%;
}

.message-wrapper.own-message .message-with-reactions {
  align-items: flex-end;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 100%;
  padding: 0.625rem 0.875rem;
  border-radius: 18px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.message-bubble:hover .message-more-btn {
  opacity: 1;
  visibility: visible;
}

.message-more-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 10;
}

.message-more-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  transform: scale(1.1);
}

.message-more-btn i {
  font-size: 16px;
  color: white;
}

.message-bubble.own-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.message-reaction {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid white;
  animation: popIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.message-reaction:hover {
  transform: scale(1.2);
}

@keyframes popIn {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.message-text {
  margin: 0;
  font-size: 0.9375rem;
  line-height: 1.4;
  word-wrap: break-word;
}

.message-time {
  font-size: 0.6875rem;
  opacity: 0.7;
  margin-top: 0.25rem;
  display: block;
}

.message-image img {
  max-width: 200px;
  border-radius: 8px;
  display: block;
}

.message-file {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.message-file:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.message-file i.material-icons {
  font-size: 20px;
}

.message-file .download-icon {
  margin-left: auto;
  font-size: 18px;
  opacity: 0.7;
}

.message-file span {
  font-size: 0.875rem;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid #e2e8f0;
  background: white;
}

/* Plus Menu */
.plus-menu-wrapper {
  position: relative;
  flex-shrink: 0;
}

.plus-icon {
  font-size: 24px;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
}

.plus-icon:hover {
  transform: rotate(90deg) scale(1.1);
}

.attach-menu {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 8px;
  min-width: 150px;
  z-index: 1000;
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.attach-menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.attach-menu-item:hover {
  background: #f7fafc;
}

.attach-menu-item i {
  font-size: 20px;
  color: #667eea;
}

.attach-menu-item span {
  font-size: 14px;
  color: #334155;
  font-weight: 500;
}

.message-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 0.625rem 1rem;
  border-radius: 20px;
  background: #f7fafc;
  font-size: 0.9375rem;
}

.message-input::placeholder {
  color: #a0aec0;
}

/* Emoji Icon */
.emoji-icon {
  font-size: 22px;
  color: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
}

.emoji-icon:hover {
  transform: scale(1.1);
}

/* Send Icon */
.send-icon {
  font-size: 22px;
  color: #cbd5e0;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.375rem;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.send-icon.active {
  color: #667eea;
}

.send-icon:hover.active {
  background: #f7fafc;
  transform: scale(1.1);
}

/* Floating Emoji Animation */
.floating-emojis {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10001;
}

.floating-emoji {
  position: fixed;
  font-size: 48px;
  animation: floatUp 1s ease-out forwards;
  pointer-events: none;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

@keyframes floatUp {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1) rotate(0deg);
  }
  50% {
    transform: translateY(-60px) scale(1.3) rotate(15deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-120px) scale(0.8) rotate(-10deg);
  }
}

.float-enter-active {
  animation: floatUp 1s ease-out;
}

.float-leave-active {
  animation: fadeOutFloat 0.3s ease-out;
}

@keyframes fadeOutFloat {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (max-width: 768px) {
  .chat-popup {
    right: 20px;
    width: calc(100% - 40px);
    max-width: 328px;
  }
}

/* Context Menu */
.message-context-menu {
  position: fixed;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 0.5rem 0;
  z-index: 10000;
  min-width: 150px;
}

.message-context-menu .menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.message-context-menu .menu-item:hover {
  background: #f3f4f6;
}

.message-context-menu .menu-item.delete {
  color: #ef4444;
}

.message-context-menu .menu-item.delete:hover {
  background: #fee2e2;
}

.message-context-menu .menu-item i {
  font-size: 20px;
}

.message-context-menu .menu-item span {
  font-size: 0.9rem;
}

/* Edit Modal */
.edit-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.edit-modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.edit-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.edit-modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.edit-modal-header .close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  border-radius: 4px;
}

.edit-modal-header .close-btn:hover {
  background: #f3f4f6;
}

.edit-modal-body {
  padding: 1.5rem;
}

.edit-modal-body textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
}

.edit-modal-body textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.edit-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.edit-modal-footer button {
  padding: 0.625rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-modal-footer .btn-cancel {
  background: #f3f4f6;
  border: none;
  color: #374151;
}

.edit-modal-footer .btn-cancel:hover {
  background: #e5e7eb;
}

.edit-modal-footer .btn-save {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
}

.edit-modal-footer .btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.edit-modal-footer .btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Delete button styles */
.btn-delete {
  background: #ef4444;
  border: none;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-delete:hover {
  background: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.delete-confirm-modal .edit-modal-body {
  padding: 20px;
  text-align: center;
}

.delete-confirm-modal .edit-modal-body p {
  margin: 0;
  font-size: 16px;
  color: #4b5563;
}

/* Emoji Picker Modal */
.emoji-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  background: transparent;
}

.emoji-picker-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  width: 350px;
  max-height: 450px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeInUp 0.2s ease;
}

.emoji-picker-search {
  display: flex;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
  gap: 8px;
}

.emoji-picker-search i {
  color: #9ca3af;
  font-size: 20px;
}

.emoji-picker-search input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 14px;
  color: #1f2937;
}

.emoji-picker-search input::placeholder {
  color: #9ca3af;
}

.emoji-categories {
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
}

.emoji-categories::-webkit-scrollbar {
  height: 4px;
}

.emoji-categories::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.category-btn {
  background: none;
  border: none;
  padding: 8px;
  font-size: 20px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.category-btn:hover {
  background: #f3f4f6;
}

.category-btn.active {
  background: rgba(102, 126, 234, 0.1);
}

.emoji-category-title {
  padding: 8px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #6b7280;
  border-bottom: 1px solid #e5e7eb;
}

.emoji-grid-container {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  align-content: start;
}

.emoji-grid-container::-webkit-scrollbar {
  width: 8px;
}

.emoji-grid-container::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.emoji-grid-container::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.emoji-grid-container::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.emoji-item {
  background: none;
  border: none;
  font-size: 28px;
  padding: 6px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
}

.emoji-item:hover {
  background: #f3f4f6;
  transform: scale(1.2);
}

.emoji-item:active {
  transform: scale(1.1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .emoji-picker-container {
    width: 320px;
    max-height: 400px;
  }

  .emoji-grid-container {
    grid-template-columns: repeat(7, 1fr);
  }

  .emoji-item {
    font-size: 24px;
  }
}

/* Video Call Styles */
.video-call-btn {
  color: white !important;
}

.call-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100000;
}

.call-modal {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  min-width: 300px;
}

.call-header h3 {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.call-header p {
  margin: 0;
  color: #6b7280;
  font-size: 1rem;
}

.call-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 2rem;
}

.call-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.call-btn.accept {
  background: #10b981;
  color: white;
}

.call-btn.accept:hover {
  background: #059669;
  transform: scale(1.1);
}

.call-btn.reject {
  background: #ef4444;
  color: white;
}

.call-btn.reject:hover {
  background: #dc2626;
  transform: scale(1.1);
}

.call-window {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #000;
}

.call-video-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.local-video {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 200px;
  height: 150px;
  border-radius: 12px;
  object-fit: cover;
  border: 2px solid white;
  z-index: 10;
}

.call-controls {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.7);
}

.control-btn {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.control-btn.disabled {
  background: rgba(255, 0, 0, 0.5);
}

.control-btn.end-call {
  background: #ef4444;
}

.control-btn.end-call:hover {
  background: #dc2626;
}

.call-status {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
}
</style>
