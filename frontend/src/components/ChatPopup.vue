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
              $buildAssetUrl(
                'uploads/user/' + conversation.participant.profilePicture
              )
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
        <!-- Group Members Button -->
        <i
          v-if="conversation?.isGroup"
          class="material-icons action-btn"
          @click.stop="showGroupMembers"
          title="Thành viên nhóm"
        >
          people
        </i>

        <i
          v-if="!conversation?.isGroup"
          class="material-icons action-btn"
          @click.stop="handleCallButton"
          title="Gọi video"
        >
          {{ isCallActive ? "call_end" : "videocam" }}
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
              :src="
                $buildAssetUrl('uploads/user/' + message.sender.profilePicture)
              "
              class="message-avatar"
            />
            <img
              v-else-if="!isOwnMessage(message)"
              src="@/assets/defaultProfile.png"
              class="message-avatar"
            />

            <div
              class="message-bubble"
              :class="{ 'own-bubble': isOwnMessage(message) }"
            >
              <div v-if="message.messageType === 'image'" class="message-image">
                <img
                  :src="$buildAssetUrl('uploads/' + message.file)"
                  alt="Image"
                />
              </div>
              <div
                v-else-if="message.messageType === 'file'"
                class="message-file"
              >
                <i class="material-icons">attach_file</i>
                <span>{{ message.file }}</span>
              </div>
              <p v-else class="message-text">{{ message.content }}</p>
              <span class="message-time">{{
                formatTime(message.createdAt)
              }}</span>
            </div>
          </div>
          <!-- Anchor element để scroll tới -->
          <div ref="messagesEnd"></div>
        </div>
      </div>

      <div class="chat-input">
        <div class="input-actions">
          <!-- <i class="material-icons action-icon" @click="triggerFileInput">attach_file</i> -->
          <i class="material-icons action-icon" @click="triggerImageInput"
            >image</i
          >
          <input
            type="file"
            ref="fileInput"
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
        />
        <i
          class="material-icons send-btn"
          @click="sendMessage"
          :class="{ active: messageInput.trim() }"
        >
          send
        </i>
      </div>
    </div>

    <!-- Incoming Call Modal -->
    <teleport to="body">
      <div
        v-if="incomingCall && !isCallModalVisible"
        class="call-overlay incoming"
      >
        <div class="call-dialog">
          <div class="call-dialog-header">
            <i class="material-icons call-icon">videocam</i>
            <div class="call-dialog-info">
              <span class="call-dialog-title">Cuộc gọi đến</span>
              <span class="call-dialog-subtitle">
                {{ incomingCallerName }}
              </span>
            </div>
          </div>
          <div class="call-dialog-actions">
            <button class="call-btn reject" @click="rejectIncomingCall">
              <i class="material-icons">call_end</i>
              Từ chối
            </button>
            <button class="call-btn accept" @click="acceptIncomingCall">
              <i class="material-icons">call</i>
              Trả lời
            </button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- Active Call Window -->
    <teleport to="body">
      <div v-if="isCallModalVisible" class="call-overlay active">
        <div class="call-window">
          <div class="call-window-header">
            <div class="call-window-info">
              <span class="call-window-title">
                {{ conversation?.participant?.displayName || "Cuộc gọi video" }}
              </span>
              <span class="call-window-status">{{ callStatusLabel }}</span>
            </div>
            <button class="call-window-close" @click="endCall(true)">
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="call-video-container">
            <video
              ref="remoteVideo"
              class="remote-video"
              autoplay
              playsinline
            ></video>
            <video
              ref="localVideo"
              class="local-video"
              autoplay
              playsinline
              muted
            ></video>
          </div>
          <div class="call-controls">
            <button
              class="call-control-btn"
              :class="{ muted: isAudioMuted }"
              @click="toggleAudio"
            >
              <i class="material-icons">
                {{ isAudioMuted ? "mic_off" : "mic" }}
              </i>
            </button>
            <button
              class="call-control-btn"
              :class="{ muted: isVideoDisabled }"
              @click="toggleVideo"
            >
              <i class="material-icons">
                {{ isVideoDisabled ? "videocam_off" : "videocam" }}
              </i>
            </button>
            <button class="call-control-btn end" @click="endCall(true)">
              <i class="material-icons">call_end</i>
            </button>
          </div>
        </div>
      </div>
    </teleport>

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
  </div>
</template>

<script>
import MessageAPI from "@/api/messages";
import socketService from "@/services/socketService";
import GroupMembersModal from "./GroupMembersModal.vue";

export default {
  name: "ChatPopup",
  components: {
    GroupMembersModal,
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
      callStatus: "idle",
      isCallModalVisible: false,
      incomingCall: null,
      isCallInitiator: false,
      peerConnection: null,
      localStream: null,
      remoteStream: null,
      isAudioMuted: false,
      isVideoDisabled: false,
      iceCandidateQueue: [],
      callTimeoutTimer: null,
    };
  },
  computed: {
    isCallActive() {
      return ["connecting", "in-call"].includes(this.callStatus);
    },
    callStatusLabel() {
      switch (this.callStatus) {
        case "requesting":
          return "Đang gọi...";
        case "ringing":
          return "Có cuộc gọi đến";
        case "connecting":
          return "Đang kết nối...";
        case "in-call":
          return "Đang trong cuộc gọi";
        default:
          return "Sẵn sàng";
      }
    },
    incomingCallerName() {
      if (!this.incomingCall) {
        return "";
      }

      if (this.conversation?.isGroup) {
        return "Thành viên nhóm";
      }

      if (
        this.conversation?.participant?._id?.toString() ===
        this.incomingCall.callerId?.toString()
      ) {
        return (
          this.conversation.participant.displayName ||
          this.conversation.participant.email ||
          "Người dùng"
        );
      }

      return "Cuộc gọi đến";
    },
  },
  watch: {
    "conversation._id": {
      handler(newId, oldId) {
        // Leave old conversation
        if (oldId) {
          if (this.callStatus !== "idle") {
            this.endCall(true);
          }
          console.log("🚪 Leaving old conversation:", oldId);
          socketService.leaveConversation(oldId);
        }

        // Load and join new conversation
        if (newId) {
          console.log("🚀 Joining new conversation:", newId);
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
      }
    },
  },
  mounted() {
    console.log("🎧 ChatPopup mounted, setting up socket listeners");
    // Đợi một chút để đảm bảo socket đã connect
    this.$nextTick(() => {
      this.setupSocketListeners();
      this.setupCallListeners();
    });
  },
  beforeUnmount() {
    console.log("🧹 ChatPopup unmounting, cleaning up");
    // Clean up socket listeners
    if (this.conversation?._id) {
      socketService.leaveConversation(this.conversation._id);
    }
    socketService.off("newMessage", this.handleNewMessage);
    socketService.off("call:incoming", this.handleIncomingCall);
    socketService.off("call:cancelled", this.handleCallCancelled);
    socketService.off("call:rejected", this.handleCallRejected);
    socketService.off("call:accepted", this.handleCallAccepted);
    socketService.off("call:offer", this.handleCallOffer);
    socketService.off("call:answer", this.handleCallAnswer);
    socketService.off("call:iceCandidate", this.handleIceCandidate);
    socketService.off("call:ended", this.handleCallEnded);
    this.cleanupCall(false);
  },
  methods: {
    setupCallListeners() {
      socketService.onIncomingCall(this.handleIncomingCall);
      socketService.onCallCancelled(this.handleCallCancelled);
      socketService.onCallRejected(this.handleCallRejected);
      socketService.onCallAccepted(this.handleCallAccepted);
      socketService.onCallOffer(this.handleCallOffer);
      socketService.onCallAnswer(this.handleCallAnswer);
      socketService.onIceCandidate(this.handleIceCandidate);
      socketService.onCallEnded(this.handleCallEnded);
    },

    handleCallButton() {
      if (!this.conversation || this.conversation.isGroup) {
        return;
      }

      if (
        ["requesting", "ringing", "connecting", "in-call"].includes(
          this.callStatus
        )
      ) {
        this.endCall(true);
      } else {
        this.initiateCall();
      }
    },

    async initiateCall() {
      if (!this.conversation?._id) {
        return;
      }

      try {
        this.isCallInitiator = true;
        this.callStatus = "requesting";
        this.isCallModalVisible = true;
        this.$store.dispatch("setCallState", {
          status: "requesting",
          conversationId: this.conversation._id,
          callerId: this.currentUserId,
          callType: "video",
          isGroup: !!this.conversation?.isGroup,
        });
        this.$store.dispatch("setCallError", null);

        await this.prepareLocalStream();
        await this.createPeerConnection();

        socketService.requestCall(this.conversation._id, "video");
        this.startCallTimeout();
      } catch (error) {
        console.error("initiateCall error:", error);
        this.handleCallError("Không thể bắt đầu cuộc gọi", true);
      }
    },

    async prepareLocalStream() {
      if (this.localStream) {
        this.attachLocalStream();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        this.localStream = stream;
        this.isAudioMuted = false;
        this.isVideoDisabled = false;
        this.attachLocalStream();
      } catch (error) {
        console.error("prepareLocalStream error:", error);
        throw error;
      }
    },

    attachLocalStream() {
      if (!this.localStream || !this.$refs.localVideo) {
        return;
      }
      this.$refs.localVideo.srcObject = this.localStream;
    },

    attachRemoteStream() {
      if (!this.remoteStream || !this.$refs.remoteVideo) {
        return;
      }
      this.$refs.remoteVideo.srcObject = this.remoteStream;
    },

    async createPeerConnection() {
      if (this.peerConnection) {
        return this.peerConnection;
      }

      const configuration = {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      };

      const pc = new RTCPeerConnection(configuration);
      this.peerConnection = pc;

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => {
          pc.addTrack(track, this.localStream);
        });
      }

      pc.ontrack = (event) => {
        const [stream] = event.streams;
        if (stream) {
          this.remoteStream = stream;
          this.attachRemoteStream();
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate && this.conversation?._id) {
          socketService.sendIceCandidate(
            this.conversation._id,
            event.candidate
          );
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          this.callStatus = "in-call";
          this.$store.dispatch("updateCallStatus", "in-call");
          this.clearCallTimeout();
        } else if (
          pc.connectionState === "failed" ||
          pc.connectionState === "disconnected"
        ) {
          this.handleCallError("Kết nối bị gián đoạn");
        }
      };

      await this.drainIceQueue();

      return pc;
    },

    async drainIceQueue() {
      if (!this.peerConnection || !this.iceCandidateQueue.length) {
        return;
      }

      const queue = [...this.iceCandidateQueue];
      this.iceCandidateQueue = [];

      for (const candidate of queue) {
        try {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(candidate)
          );
        } catch (error) {
          console.error("Add queued ICE candidate error:", error);
        }
      }
    },

    handleIncomingCall(payload) {
      if (!payload || payload.conversationId !== this.conversation?._id) {
        return;
      }

      if (payload.callerId?.toString() === this.currentUserId?.toString()) {
        return;
      }

      if (this.callStatus !== "idle") {
        socketService.rejectCall(payload.conversationId);
        return;
      }

      this.incomingCall = payload;
      this.callStatus = "ringing";
      this.$store.dispatch("setCallState", {
        status: "ringing",
        conversationId: payload.conversationId,
        callerId: payload.callerId,
        callType: payload.callType || "video",
        isGroup: payload.isGroup || false,
      });
      this.$store.dispatch("setCallError", null);
      this.startCallTimeout();
    },

    async acceptIncomingCall() {
      if (!this.incomingCall) {
        return;
      }

      try {
        const { conversationId } = this.incomingCall;
        this.isCallInitiator = false;
        this.isCallModalVisible = true;
        this.callStatus = "connecting";
        this.$store.dispatch("updateCallStatus", "connecting");
        await this.prepareLocalStream();
        await this.createPeerConnection();
        socketService.acceptCall(conversationId);
        this.incomingCall = null;
      } catch (error) {
        console.error("acceptIncomingCall error:", error);
        this.handleCallError("Không thể tham gia cuộc gọi");
      }
    },

    rejectIncomingCall() {
      if (!this.incomingCall) {
        return;
      }
      socketService.rejectCall(this.incomingCall.conversationId);
      this.incomingCall = null;
      this.callStatus = "idle";
      this.$store.dispatch("resetCallState");
      this.clearCallTimeout();
    },

    async handleCallAccepted(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (
        !this.isCallInitiator ||
        data.userId?.toString() === this.currentUserId?.toString()
      ) {
        return;
      }

      try {
        await this.createAndSendOffer();
      } catch (error) {
        console.error("handleCallAccepted error:", error);
        this.handleCallError("Không thể thiết lập cuộc gọi");
      }
    },

    async createAndSendOffer() {
      if (!this.peerConnection) {
        await this.createPeerConnection();
      }

      if (!this.peerConnection) {
        return;
      }

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      socketService.sendOffer(this.conversation._id, offer);
      this.callStatus = "connecting";
      this.$store.dispatch("updateCallStatus", "connecting");
    },

    async handleCallOffer(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (data.userId?.toString() === this.currentUserId?.toString()) {
        return;
      }

      try {
        if (!this.peerConnection) {
          await this.createPeerConnection();
        }

        if (!this.peerConnection) {
          return;
        }

        const offer = new RTCSessionDescription(data.offer);
        await this.peerConnection.setRemoteDescription(offer);

        if (!this.isCallInitiator) {
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);
          socketService.sendAnswer(data.conversationId, answer);
          this.callStatus = "connecting";
          this.$store.dispatch("updateCallStatus", "connecting");
        }

        await this.drainIceQueue();
      } catch (error) {
        console.error("handleCallOffer error:", error);
        this.handleCallError("Không thể xử lý tín hiệu cuộc gọi");
      }
    },

    async handleCallAnswer(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (!this.isCallInitiator) {
        return;
      }

      try {
        if (!this.peerConnection) {
          return;
        }

        const answer = new RTCSessionDescription(data.answer);
        await this.peerConnection.setRemoteDescription(answer);
        await this.drainIceQueue();
      } catch (error) {
        console.error("handleCallAnswer error:", error);
        this.handleCallError("Không thể hoàn tất kết nối cuộc gọi");
      }
    },

    async handleIceCandidate(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (data.userId?.toString() === this.currentUserId?.toString()) {
        return;
      }

      if (this.peerConnection) {
        try {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error("handleIceCandidate error:", error);
        }
      } else {
        this.iceCandidateQueue.push(data.candidate);
      }
    },

    handleCallCancelled(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (data.userId?.toString() === this.currentUserId?.toString()) {
        return;
      }

      if (this.incomingCall) {
        this.incomingCall = null;
        this.callStatus = "idle";
        this.$store.dispatch("resetCallState");
        this.clearCallTimeout();
        return;
      }

      if (this.isCallInitiator) {
        this.handleCallError("Người dùng đã hủy cuộc gọi");
      } else {
        this.cleanupCall(false);
      }
    },

    handleCallRejected(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (data.userId?.toString() === this.currentUserId?.toString()) {
        return;
      }

      if (this.isCallInitiator) {
        this.handleCallError("Người dùng đã từ chối cuộc gọi");
      }
    },

    handleCallEnded(data) {
      if (!data || data.conversationId !== this.conversation?._id) {
        return;
      }

      if (data.userId?.toString() === this.currentUserId?.toString()) {
        return;
      }

      this.cleanupCall(false);
    },

    toggleAudio() {
      if (!this.localStream) {
        return;
      }

      const nextMuted = !this.isAudioMuted;
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !nextMuted;
      });
      this.isAudioMuted = nextMuted;
    },

    toggleVideo() {
      if (!this.localStream) {
        return;
      }

      const nextDisabled = !this.isVideoDisabled;
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = !nextDisabled;
      });
      this.isVideoDisabled = nextDisabled;
    },

    clearCallTimeout() {
      if (this.callTimeoutTimer) {
        clearTimeout(this.callTimeoutTimer);
        this.callTimeoutTimer = null;
      }
    },

    startCallTimeout() {
      this.clearCallTimeout();
      this.callTimeoutTimer = setTimeout(() => {
        if (["requesting", "ringing"].includes(this.callStatus)) {
          this.handleCallError("Không có phản hồi từ người dùng", true);
        }
      }, 30000);
    },

    endCall(sendSignal = false) {
      if (sendSignal && this.conversation?._id) {
        if (this.callStatus === "requesting" && this.isCallInitiator) {
          socketService.cancelCall(this.conversation._id);
        } else if (this.callStatus === "ringing" && !this.isCallInitiator) {
          socketService.rejectCall(this.conversation._id);
        } else {
          socketService.endCall(this.conversation._id);
        }
      }
      this.cleanupCall(false);
    },

    handleCallError(message, sendSignal = false) {
      if (message) {
        console.error("[VideoCall] ", message);
        this.$store.dispatch("setCallError", message);
      } else {
        this.$store.dispatch("setCallError", null);
      }

      if (sendSignal && this.conversation?._id) {
        const currentStatus = this.callStatus;
        if (currentStatus === "requesting" && this.isCallInitiator) {
          socketService.cancelCall(this.conversation._id);
        } else if (currentStatus === "ringing" && !this.isCallInitiator) {
          socketService.rejectCall(this.conversation._id);
        } else {
          socketService.endCall(this.conversation._id);
        }
      }

      this.cleanupCall(false);
    },

    cleanupCall(sendSignal = false) {
      this.clearCallTimeout();

      if (sendSignal && this.conversation?._id) {
        socketService.endCall(this.conversation._id);
      }

      if (this.peerConnection) {
        try {
          this.peerConnection.ontrack = null;
          this.peerConnection.onicecandidate = null;
          this.peerConnection.onconnectionstatechange = null;
          this.peerConnection.close();
        } catch (error) {
          console.error("cleanupCall close peer error:", error);
        }
      }

      this.peerConnection = null;

      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
      }

      if (this.remoteStream) {
        this.remoteStream.getTracks?.().forEach((track) => track.stop());
      }

      if (this.$refs.localVideo) {
        this.$refs.localVideo.srcObject = null;
      }

      if (this.$refs.remoteVideo) {
        this.$refs.remoteVideo.srcObject = null;
      }

      this.localStream = null;
      this.remoteStream = null;
      this.isCallModalVisible = false;
      this.isCallInitiator = false;
      this.isAudioMuted = false;
      this.isVideoDisabled = false;
      this.incomingCall = null;
      this.iceCandidateQueue = [];
      this.callStatus = "idle";
      this.$store.dispatch("resetCallState");
    },

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
            console.log("✅ Socket connected, setting up listener");
            socketService.onNewMessage(this.handleNewMessage);
          } else {
            console.error("❌ Socket connection failed");
          }
        }, 1000);
      } else {
        // Socket đã connect, setup listener ngay
        socketService.onNewMessage(this.handleNewMessage);
      }
    },

    handleNewMessage(data) {
      console.log("📨 New message received in ChatPopup:", data);

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
        console.log("⏭️ Message not for this conversation, ignoring");
        return;
      }

      // Kiểm tra tin nhắn đã tồn tại chưa (tránh duplicate)
      const exists = this.messages.some((m) => m && m._id === message._id);
      if (exists) {
        console.log("⏭️ Message already exists, ignoring");
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
          console.log(
            "🔄 Replacing temp message with real message from socket"
          );
          this.messages.splice(tempIndex, 1, message);

          // Scroll to bottom
          this.$nextTick(() => {
            this.scrollToBottom();
          });
          return;
        }
      }

      console.log("✅ Adding new message to popup:", message);

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
          this.messages = response.data.messages || [];

          // Scroll to bottom sau khi load
          this.$nextTick(() => {
            this.scrollToBottom();
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
          sender: {
            _id: currentUser._id,
            displayName: currentUser.displayName,
            profilePicture: currentUser.profilePicture,
          },
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
      // Sử dụng messagesEnd anchor để scroll
      if (this.$refs.messagesEnd) {
        this.$refs.messagesEnd.scrollIntoView({
          behavior: "smooth",
          block: "end",
        });
      }

      // Fallback: Dùng scrollTop nếu messagesEnd không tồn tại
      if (this.$refs.messagesContainer && !this.$refs.messagesEnd) {
        setTimeout(() => {
          this.$refs.messagesContainer.scrollTop =
            this.$refs.messagesContainer.scrollHeight;
        }, 100);
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

    formatTime(timestamp) {
      if (!timestamp) return "";

      const date = new Date(timestamp);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");

      return `${hours}:${minutes}`;
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
}

.message-wrapper.own-message {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 70%;
  padding: 0.625rem 0.875rem;
  border-radius: 18px;
  background: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  position: relative;
}

.message-bubble.own-bubble {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
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
}

.chat-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-top: 1px solid #e2e8f0;
  background: white;
}

.input-actions {
  display: flex;
  gap: 0.25rem;
}

.action-icon {
  font-size: 20px;
  color: #667eea;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.action-icon:hover {
  background: #f7fafc;
  transform: scale(1.1);
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

.send-btn {
  font-size: 22px;
  color: #cbd5e0;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 0.375rem;
  border-radius: 50%;
}

.send-btn.active {
  color: #667eea;
}

.send-btn:hover.active {
  background: #f7fafc;
  transform: scale(1.1);
}

.call-overlay {
  position: fixed;
  inset: 0;
  background: rgba(17, 24, 39, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 1rem;
}

.call-dialog {
  background: #ffffff;
  border-radius: 16px;
  padding: 24px;
  width: 320px;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.25);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.call-dialog-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.call-icon {
  font-size: 36px;
  color: #667eea;
}

.call-dialog-info {
  display: flex;
  flex-direction: column;
}

.call-dialog-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: #1a202c;
}

.call-dialog-subtitle {
  color: #4a5568;
  font-size: 0.95rem;
}

.call-dialog-actions {
  display: flex;
  gap: 16px;
}

.call-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 999px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  color: #fff;
}

.call-btn.accept {
  background: #48bb78;
}

.call-btn.accept:hover {
  background: #38a169;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(56, 161, 105, 0.35);
}

.call-btn.reject {
  background: #f56565;
}

.call-btn.reject:hover {
  background: #e53e3e;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(229, 62, 62, 0.35);
}

.call-window {
  width: min(720px, 100%);
  height: min(480px, 80vh);
  background: #1f2937;
  border-radius: 18px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 50px rgba(15, 23, 42, 0.35);
}

.call-window-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(31, 41, 55, 0.85);
  color: #f9fafb;
}

.call-window-info {
  display: flex;
  flex-direction: column;
}

.call-window-title {
  font-weight: 600;
}

.call-window-status {
  font-size: 0.85rem;
  color: #cbd5f5;
}

.call-window-close {
  background: transparent;
  border: none;
  color: #e5e7eb;
  cursor: pointer;
  font-size: 20px;
  line-height: 1;
  transition: color 0.2s ease;
}

.call-window-close:hover {
  color: #ffffff;
}

.call-video-container {
  position: relative;
  flex: 1;
  background: #111827;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remote-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #0f172a;
}

.local-video {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 180px;
  height: 120px;
  object-fit: cover;
  background: #000;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.45);
}

.call-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 16px;
  background: rgba(17, 24, 39, 0.9);
}

.call-control-btn {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: #374151;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  font-size: 22px;
}

.call-control-btn:hover {
  background: #4b5563;
  transform: scale(1.05);
}

.call-control-btn.muted {
  background: #9b2c2c;
}

.call-control-btn.muted:hover {
  background: #742a2a;
}

.call-control-btn.end {
  background: #ef4444;
}

.call-control-btn.end:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .chat-popup {
    right: 20px;
    width: calc(100% - 40px);
    max-width: 328px;
  }

  .call-window {
    height: 70vh;
  }

  .local-video {
    width: 140px;
    height: 96px;
  }
}
</style>
