/**
 * Live Orders helpers — room folio vs table POS billing.
 * Amounts / settlement stay on Room Folio for ROOM_QR orders.
 */

export function isRoomFolioOrder(order) {
  if (!order) return false;
  if (order.orderSource === "ROOM_QR") return true;
  if (order.roomBookingId) return true;
  return false;
}

export function roomNumberFromOrder(order) {
  if (!order) return "";
  const table = String(order.tableNumber || "");
  if (/^ROOM-/i.test(table)) {
    return table.replace(/^ROOM-/i, "");
  }
  return table || "";
}

export function orderPlaceLabel(order) {
  if (isRoomFolioOrder(order)) {
    const n = roomNumberFromOrder(order);
    return n ? `ROOM ${n}` : "ROOM";
  }
  if (order?.tableNumber === "PARCEL") return "PARCEL";
  return order?.tableNumber ? `TABLE ${order.tableNumber}` : "TABLE";
}

export function orderTypeLabel(order) {
  if (isRoomFolioOrder(order)) return "Room order";
  if (order?.tableNumber === "PARCEL") return "Counter Parcel";
  return "Dine In";
}
