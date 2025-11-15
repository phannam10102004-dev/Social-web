<template>
  <teleport to="body">
    <div class="modal-overlay" @click.self="closeModal">
      <div class="modal-container">
        <div class="modal-header">
          <h2>Thành viên nhóm ({{ members.length }})</h2>
          <button class="close-btn" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <!-- Group Full Warning -->
          <div
            v-if="isAdmin && members.length >= 200"
            class="group-full-warning"
          >
            <i class="material-icons">info</i>
            <span>Nhóm đã đạt giới hạn tối đa 200 thành viên</span>
          </div>

          <!-- Add Member Section (All members can add, not just admins) -->
          <div v-if="members.length < 200" class="add-member-section">
            <button
              class="btn-add-member"
              @click="showAddMemberUI = !showAddMemberUI"
            >
              <i class="material-icons">person_add</i>
              <span>Thêm thành viên ({{ members.length }}/200)</span>
            </button>

            <!-- Add Member UI -->
            <div v-if="showAddMemberUI" class="add-member-ui">
              <div class="search-box">
                <i class="material-icons">search</i>
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Tìm kiếm bạn bè để thêm..."
                />
              </div>

              <div
                v-if="filteredAvailableFriends.length > 0"
                class="available-friends"
              >
                <div
                  v-for="friend in filteredAvailableFriends"
                  :key="friend._id"
                  class="friend-item"
                  @click="addMember(friend._id)"
                >
                  <img
                    :src="
                      friend.profilePicture
                        ? $buildProfilePictureUrl(friend.profilePicture)
                        : require('@/assets/defaultProfile.png')
                    "
                    :alt="friend.displayName"
                  />
                  <div class="friend-info">
                    <span class="friend-name">{{
                      friend.displayName || friend.email
                    }}</span>
                  </div>
                  <i class="material-icons add-icon">add_circle</i>
                </div>
              </div>
              <div v-else class="empty-state-small">
                <span>{{
                  searchQuery
                    ? "Không tìm thấy"
                    : "Tất cả bạn bè đã ở trong nhóm"
                }}</span>
              </div>
            </div>
          </div>

          <!-- Group Management (Only for Creator) -->
          <div v-if="isGroupCreator" class="group-management-section">
            <h3 class="section-title">Quản lý nhóm</h3>

            <!-- Transfer Ownership -->
            <button
              class="btn-management transfer"
              @click="showTransferOwnershipUI = !showTransferOwnershipUI"
            >
              <i class="material-icons">swap_horiz</i>
              <span>Chuyển quyền trưởng nhóm</span>
            </button>

            <!-- Transfer Ownership UI -->
            <div v-if="showTransferOwnershipUI" class="transfer-ownership-ui">
              <p class="hint-text">
                Chọn thành viên để chuyển quyền trưởng nhóm:
              </p>
              <div class="members-select-list">
                <div
                  v-for="member in eligibleForOwnership"
                  :key="member._id"
                  class="member-select-item"
                  @click="confirmTransferOwnership(member)"
                >
                  <img
                    :src="
                      member.profilePicture
                        ? $buildProfilePictureUrl(member.profilePicture)
                        : require('@/assets/defaultProfile.png')
                    "
                    :alt="member.displayName"
                  />
                  <div class="member-select-info">
                    <span class="member-select-name">{{
                      member.displayName || member.email
                    }}</span>
                    <span v-if="isMemberAdmin(member._id)" class="mini-badge"
                      >⭐ Admin</span
                    >
                  </div>
                  <i class="material-icons select-icon">chevron_right</i>
                </div>
              </div>
            </div>

            <!-- Disband Group -->
            <button class="btn-management disband" @click="confirmDisbandGroup">
              <i class="material-icons">delete_forever</i>
              <span>Giải tán nhóm</span>
            </button>
          </div>

          <!-- Members List -->
          <div class="members-list">
            <div
              v-for="member in members"
              :key="member._id"
              class="member-item"
              :class="{ creator: isCreator(member._id) }"
            >
              <img
                :src="
                  member.profilePicture
                    ? `http://localhost:3000/uploads/user/${member.profilePicture}`
                    : require('@/assets/defaultProfile.png')
                "
                :alt="member.displayName"
              />

              <div class="member-info">
                <div class="member-name-row">
                  <span class="member-name">{{
                    member.displayName || member.email
                  }}</span>
                  <span v-if="isCreator(member._id)" class="badge creator-badge"
                    >👑 Trưởng nhóm</span
                  >
                  <span
                    v-else-if="isMemberAdmin(member._id)"
                    class="badge admin-badge"
                    >⭐ Quản trị viên</span
                  >
                </div>
                <span class="member-email">{{ member.email }}</span>
              </div>

              <!-- Actions for OTHER members (admin can remove, creator can promote) -->
              <div
                v-if="
                  isAdmin &&
                  !isCreator(member._id) &&
                  member._id !== currentUserId
                "
                class="member-actions"
              >
                <!-- Promote button (only group creator can promote) -->
                <button
                  v-if="isGroupCreator && !isMemberAdmin(member._id)"
                  class="action-btn promote-btn"
                  @click="promoteMember(member._id)"
                  title="Thăng cấp làm quản trị viên"
                >
                  <i class="material-icons">star</i>
                </button>

                <!-- Remove button - Visible for all admins -->
                <button
                  class="action-btn remove-btn"
                  @click="confirmRemoveMember(member)"
                  title="Xóa khỏi nhóm"
                >
                  <i class="material-icons">person_remove</i>
                </button>
              </div>

              <!-- Leave button for current user (not creator) -->
              <div
                v-else-if="
                  member._id === currentUserId && !isCreator(member._id)
                "
                class="member-actions"
              >
                <button
                  class="action-btn leave-btn"
                  @click="confirmLeaveGroup"
                  title="Rời nhóm"
                >
                  <i class="material-icons">exit_to_app</i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Remove Modal -->
    <div
      v-if="memberToRemove"
      class="confirm-overlay"
      @click.self="memberToRemove = null"
    >
      <div class="confirm-box">
        <h3>Xác nhận xóa thành viên</h3>
        <p>
          Bạn có chắc muốn xóa
          <strong>{{ memberToRemove.displayName }}</strong> khỏi nhóm?
        </p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="memberToRemove = null">Hủy</button>
          <button class="btn-confirm" @click="removeMember">Xóa</button>
        </div>
      </div>
    </div>

    <!-- Confirm Leave Modal -->
    <div
      v-if="showLeaveConfirm"
      class="confirm-overlay"
      @click.self="showLeaveConfirm = false"
    >
      <div class="confirm-box">
        <h3>Xác nhận rời nhóm</h3>
        <p>Bạn có chắc muốn rời khỏi nhóm này?</p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="showLeaveConfirm = false">
            Hủy
          </button>
          <button class="btn-confirm" @click="leaveGroup">Rời nhóm</button>
        </div>
      </div>
    </div>

    <!-- Confirm Transfer Ownership Modal -->
    <div
      v-if="memberToTransfer"
      class="confirm-overlay"
      @click.self="memberToTransfer = null"
    >
      <div class="confirm-box">
        <h3>⚠️ Chuyển quyền trưởng nhóm</h3>
        <p>
          Bạn có chắc muốn chuyển quyền trưởng nhóm cho
          <strong>{{ memberToTransfer.displayName }}</strong
          >?
        </p>
        <p class="warning-text">
          Sau khi chuyển, bạn sẽ không còn là trưởng nhóm nữa!
        </p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="memberToTransfer = null">
            Hủy
          </button>
          <button class="btn-confirm" @click="transferOwnership">
            Xác nhận
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Disband Group Modal -->
    <div
      v-if="showDisbandConfirm"
      class="confirm-overlay"
      @click.self="showDisbandConfirm = false"
    >
      <div class="confirm-box danger">
        <h3>🚨 Giải tán nhóm</h3>
        <p>Bạn có chắc muốn <strong>GIẢI TÁN</strong> nhóm này?</p>
        <p class="danger-text">
          Hành động này không thể hoàn tác! Tất cả thành viên sẽ bị xóa khỏi
          nhóm.
        </p>
        <div class="confirm-actions">
          <button class="btn-cancel" @click="showDisbandConfirm = false">
            Hủy
          </button>
          <button class="btn-danger" @click="disbandGroup">
            Giải tán nhóm
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script>
import GroupMessageAPI from "@/api/groupMessages";
import MessageAPI from "@/api/messages";

export default {
  name: "GroupMembersModal",
  props: {
    conversation: {
      type: Object,
      required: true,
    },
    currentUserId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      showAddMemberUI: false,
      searchQuery: "",
      availableFriends: [],
      memberToRemove: null,
      showLeaveConfirm: false,
      showTransferOwnershipUI: false,
      memberToTransfer: null,
      showDisbandConfirm: false,
    };
  },
  computed: {
    members() {
      return this.conversation.participants || [];
    },
    isGroupCreator() {
      return (
        this.conversation.createdBy?._id === this.currentUserId ||
        this.conversation.createdBy === this.currentUserId
      );
    },
    isAdmin() {
      // Trưởng nhóm hoặc có trong danh sách admins
      const isCreator = this.isGroupCreator;
      const isInAdmins = this.conversation.admins?.some(
        (admin) => (admin._id || admin) === this.currentUserId
      );
      console.log("🔍 isAdmin check:", {
        isCreator,
        isInAdmins,
        currentUserId: this.currentUserId,
        admins: this.conversation.admins,
      });
      return isCreator || isInAdmins;
    },
    filteredAvailableFriends() {
      if (!this.searchQuery.trim()) {
        return this.availableFriends;
      }
      const query = this.searchQuery.toLowerCase();
      return this.availableFriends.filter((friend) => {
        const name = (friend.displayName || "").toLowerCase();
        const email = (friend.email || "").toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    },
    eligibleForOwnership() {
      // Tất cả thành viên trừ creator
      return this.members.filter((m) => !this.isCreator(m._id));
    },
  },
  methods: {
    isCreator(memberId) {
      return (
        this.conversation.createdBy?._id === memberId ||
        this.conversation.createdBy === memberId
      );
    },

    isMemberAdmin(memberId) {
      return this.conversation.admins?.some((admin) => {
        return (admin._id || admin) === memberId;
      });
    },

    async loadAvailableFriends() {
      try {
        const response = await MessageAPI.getFriends();
        if (response.status === 200) {
          const memberIds = this.members.map((m) => m._id || m);
          this.availableFriends = response.data.filter(
            (f) => !memberIds.includes(f._id)
          );
        }
      } catch (error) {
        console.error("Load friends error:", error);
      }
    },

    async refreshConversation() {
      try {
        console.log("🔄 Fetching full conversation details...");
        const response = await MessageAPI.getConversations();
        if (response.status === 200) {
          const conversations = response.data;
          const fullConversation = conversations.find(
            (c) => c._id === this.conversation._id
          );

          if (fullConversation) {
            console.log("✅ Found full conversation:", fullConversation);
            console.log(
              "✅ Populated participants:",
              fullConversation.participants
            );

            // Update the conversation object by emitting to parent
            this.$emit("conversation-refreshed", fullConversation);
          } else {
            console.warn("⚠️ Conversation not found in list");
          }
        }
      } catch (error) {
        console.error("❌ Refresh conversation error:", error);
      }
    },

    async addMember(memberId) {
      try {
        const response = await GroupMessageAPI.addMembers(
          this.conversation._id,
          [memberId]
        );
        if (response.status === 200) {
          this.$emit("members-updated", response.data);
          this.showAddMemberUI = false;
          this.searchQuery = "";
          // Refresh conversation TRƯỚC để cập nhật members list
          await this.refreshConversation();
          // Sau đó mới load lại available friends
          await this.loadAvailableFriends();
        }
      } catch (error) {
        console.error("Add member error:", error);
      }
    },

    confirmRemoveMember(member) {
      this.memberToRemove = member;
    },

    async removeMember() {
      if (!this.memberToRemove) return;

      try {
        const response = await GroupMessageAPI.removeMember(
          this.conversation._id,
          this.memberToRemove._id
        );
        if (response.status === 200) {
          this.$emit("member-removed", this.memberToRemove._id);
          this.memberToRemove = null;
          // Refresh conversation TRƯỚC để cập nhật members list
          await this.refreshConversation();
          // Sau đó mới load lại available friends
          await this.loadAvailableFriends();
        }
      } catch (error) {
        console.error("Remove member error:", error);
      }
    },

    async promoteMember(memberId) {
      try {
        const response = await GroupMessageAPI.promoteToAdmin(
          this.conversation._id,
          memberId
        );
        if (response.status === 200) {
          this.$emit("member-promoted", memberId);
          // Refresh conversation để cập nhật badge ngay
          await this.refreshConversation();
        }
      } catch (error) {
        console.error("Promote member error:", error);
      }
    },

    confirmLeaveGroup() {
      this.showLeaveConfirm = true;
    },

    async leaveGroup() {
      try {
        const response = await GroupMessageAPI.leaveGroup(
          this.conversation._id
        );
        if (response.status === 200) {
          this.$emit("left-group");
          this.showLeaveConfirm = false;
          this.closeModal();
        }
      } catch (error) {
        console.error("Leave group error:", error);
      }
    },

    confirmTransferOwnership(member) {
      this.memberToTransfer = member;
    },

    async transferOwnership() {
      if (!this.memberToTransfer) return;

      try {
        const response = await GroupMessageAPI.transferOwnership(
          this.conversation._id,
          this.memberToTransfer._id
        );
        if (response.status === 200) {
          this.$emit("ownership-transferred", response.data.conversation);
          this.memberToTransfer = null;
          this.showTransferOwnershipUI = false;
          await this.refreshConversation();
        }
      } catch (error) {
        console.error("Transfer ownership error:", error);
        alert(
          "Lỗi khi chuyển quyền: " +
            (error.response?.data?.error || error.message)
        );
      }
    },

    confirmDisbandGroup() {
      this.showDisbandConfirm = true;
    },

    async disbandGroup() {
      try {
        const response = await GroupMessageAPI.disbandGroup(
          this.conversation._id
        );
        if (response.status === 200) {
          this.$emit("group-disbanded");
          this.showDisbandConfirm = false;
          this.closeModal();
        }
      } catch (error) {
        console.error("Disband group error:", error);
        alert(
          "Lỗi khi giải tán nhóm: " +
            (error.response?.data?.error || error.message)
        );
      }
    },

    closeModal() {
      this.$emit("close");
    },
  },
  async mounted() {
    console.log("👥 [GroupMembersModal] Mounted");
    console.log("👥 [GroupMembersModal] Conversation:", this.conversation);
    console.log("👥 [GroupMembersModal] Members:", this.members);
    console.log("👥 [GroupMembersModal] Current User ID:", this.currentUserId);
    console.log(
      "👥 [GroupMembersModal] Created By:",
      this.conversation.createdBy
    );
    console.log("👥 [GroupMembersModal] Admins:", this.conversation.admins);
    console.log(
      "👥 [GroupMembersModal] Is Group Creator:",
      this.isGroupCreator
    );
    console.log("👥 [GroupMembersModal] Is Admin:", this.isAdmin);
    console.log("🔍 [Debug] Should show add member button:", this.isAdmin);

    // Check if participants are populated (have displayName property)
    const firstParticipant = this.members[0];
    const needsRefresh =
      firstParticipant && typeof firstParticipant === "string";

    console.log("👥 [GroupMembersModal] First participant:", firstParticipant);
    console.log("👥 [GroupMembersModal] Needs refresh:", needsRefresh);

    // If participants are just IDs (strings), refresh the conversation
    if (needsRefresh) {
      console.log(
        "🔄 [GroupMembersModal] Participants not populated, refreshing conversation..."
      );
      await this.refreshConversation();
    }

    // Load available friends if user is admin
    if (this.isAdmin) {
      this.loadAvailableFriends();
    }
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid var(--gray-200);
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--gray-900);
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: none;
  background: var(--gray-100);
  color: var(--gray-600);
  font-size: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--gray-200);
  color: var(--gray-900);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.add-member-section {
  border-bottom: 1px solid var(--gray-200);
  padding-bottom: 1rem;
}

.group-full-warning {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: linear-gradient(
    135deg,
    rgba(255, 152, 0, 0.1) 0%,
    rgba(255, 193, 7, 0.1) 100%
  );
  border: 2px solid rgba(255, 152, 0, 0.3);
  border-radius: var(--radius-lg);
  color: #ff9800;
  font-weight: 600;
  margin-bottom: 1rem;
}

.group-full-warning i {
  font-size: 24px;
}

.btn-add-member {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-member:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
}

.add-member-ui {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box i {
  position: absolute;
  left: 1rem;
  color: var(--gray-400);
}

.search-box input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  border: 2px solid var(--gray-200);
  border-radius: var(--radius-lg);
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: var(--primary);
}

.available-friends {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-lg);
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 1px solid var(--gray-100);
}

.friend-item:last-child {
  border-bottom: none;
}

.friend-item:hover {
  background: var(--gray-50);
}

.friend-item img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.9375rem;
}

.add-icon {
  color: var(--primary);
}

.empty-state-small {
  text-align: center;
  padding: 1rem;
  color: var(--gray-500);
  font-size: 0.875rem;
}

.members-list {
  display: flex;
  flex-direction: column;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  padding: 0.875rem;
  border-radius: var(--radius-lg);
  transition: all 0.2s;
  border: 2px solid transparent;
}

.member-item:hover {
  background: var(--gray-50);
}

.member-item.creator {
  background: linear-gradient(
    135deg,
    rgba(255, 215, 0, 0.1) 0%,
    rgba(255, 193, 7, 0.1) 100%
  );
  border-color: rgba(255, 215, 0, 0.3);
}

.member-item img {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  object-fit: cover;
  border: 2px solid white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.member-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.member-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.9375rem;
}

.member-email {
  font-size: 0.8125rem;
  color: var(--gray-500);
}

.badge {
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.6875rem;
  font-weight: 600;
}

.creator-badge {
  background: linear-gradient(135deg, #ffd700 0%, #ffc107 100%);
  color: #804f00;
}

.admin-badge {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.member-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn i {
  font-size: 20px;
}

.promote-btn {
  background: linear-gradient(135deg, #ffd700 0%, #ffc107 100%);
  color: #804f00;
}

.promote-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.remove-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff3040 100%);
  color: white;
}

.remove-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(255, 48, 64, 0.4);
}

.leave-btn {
  background: var(--gray-200);
  color: var(--gray-600);
}

.leave-btn:hover {
  background: var(--gray-300);
  color: var(--gray-900);
}

.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.confirm-box {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  max-width: 400px;
  width: 90%;
  animation: slideUp 0.2s ease;
}

.confirm-box h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--gray-900);
}

.confirm-box p {
  margin: 0 0 1.5rem 0;
  color: var(--gray-600);
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-cancel,
.btn-confirm {
  flex: 1;
  padding: 0.75rem;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--gray-100);
  color: var(--gray-700);
}

.btn-cancel:hover {
  background: var(--gray-200);
}

.btn-confirm {
  background: linear-gradient(135deg, #ff6b6b 0%, #ff3040 100%);
  color: white;
}

.btn-confirm:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(255, 48, 64, 0.4);
}

/* Group Management Section */
.group-management-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--gray-200);
}

.group-management-section .section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--gray-600);
  margin-bottom: 0.75rem;
}

.btn-management {
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 0.625rem;
  border: 2px solid;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-management.transfer {
  background: transparent;
  color: #3498db;
  border-color: #3498db;
}

.btn-management.transfer:hover {
  background: #3498db;
  color: white;
}

.btn-management.disband {
  background: transparent;
  color: #e74c3c;
  border-color: #e74c3c;
}

.btn-management.disband:hover {
  background: #e74c3c;
  color: white;
}

/* Transfer Ownership UI */
.transfer-ownership-ui {
  margin-top: 0.625rem;
  padding: 1rem;
  background: var(--gray-50);
  border-radius: var(--radius-lg);
}

.transfer-ownership-ui .hint-text {
  font-size: 0.8125rem;
  color: var(--gray-600);
  margin-bottom: 0.625rem;
}

.members-select-list {
  max-height: 300px;
  overflow-y: auto;
}

.member-select-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem;
  background: white;
  border-radius: var(--radius-lg);
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-select-item:hover {
  background: #e8f4f8;
  transform: translateX(5px);
}

.member-select-item img {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.member-select-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.member-select-name {
  font-weight: 600;
  color: var(--gray-900);
  font-size: 0.875rem;
}

.mini-badge {
  font-size: 0.6875rem;
  color: #f39c12;
  margin-top: 0.125rem;
}

.select-icon {
  color: var(--gray-400);
  font-size: 1.25rem;
}

/* Confirm boxes improvements */
.confirm-box.danger {
  border: 3px solid #e74c3c;
}

.warning-text {
  font-size: 0.8125rem;
  color: #f39c12;
  margin-top: 0.5rem;
  font-weight: 500;
}

.danger-text {
  font-size: 0.8125rem;
  color: #e74c3c;
  margin-top: 0.5rem;
  font-weight: 600;
}

.btn-danger {
  background: #e74c3c;
  color: white;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: var(--radius-lg);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-danger:hover {
  background: #c0392b;
  transform: scale(1.05);
}
</style>
