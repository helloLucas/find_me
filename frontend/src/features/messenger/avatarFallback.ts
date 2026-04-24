export const FRIEND_ICON_SRC = "/friend.png";
export const LUCAS_ICON_SRC = "/lucas_profile.png";

function normalizeSenderIdentity(senderId?: string, senderName?: string) {
  return `${senderId ?? ""} ${senderName ?? ""}`.trim().toLowerCase();
}

export function resolveMessengerFallbackAvatar(senderId?: string, senderName?: string) {
  const identity = normalizeSenderIdentity(senderId, senderName);

  if (identity.includes("lucas")) {
    return LUCAS_ICON_SRC;
  }

  return FRIEND_ICON_SRC;
}
