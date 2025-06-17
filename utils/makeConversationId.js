// Define the scheme of a chat conversation's id
// Since conversation ids are only used in application memory, it's probably safe to change them
// Just make sure that, for every pairs of users, all conversation ids are unique

export default function makeConvesationId(user1, user2) {
  const order = [user1, user2].sort();
  return `${order[0]}_${order[1]}`;
};
