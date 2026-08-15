/* RAEE CAFE — اجازه حذف پروفایل دارای سفارش
   این فایل را بعد از کد اصلی index.html لود کن.
*/
(function () {
  "use strict";

  window.deleteProfile = async function (id) {
    const p = typeof window.profileById === "function"
      ? window.profileById(id)
      : null;

    if (!p) return;

    const linkedOrders = Array.isArray(window.orders)
      ? window.orders.filter(o => o.profileId === id)
      : [];

    const unpaidOrders = linkedOrders.filter(o => {
      if (typeof window.paymentOf === "function") {
        return window.paymentOf(o) === "unpaid";
      }
      return o.paymentStatus !== "paid";
    });

    let message =
      `⚠️ حذف پروفایل\n\n` +
      `پروفایل «${profileLabelSafe(p)}» حذف شود؟\n\n`;

    if (linkedOrders.length > 0) {
      message +=
        `این پروفایل ${linkedOrders.length} سفارش مرتبط دارد.\n`;

      if (unpaidOrders.length > 0) {
        message +=
          `${unpaidOrders.length} سفارش هنوز پرداخت نشده است.\n`;
      }

      message +=
        `\nخود پروفایل حذف می‌شود و سفارش‌ها باقی می‌مانند.\n`;
    }

    message +=
      `\nاین عملیات برای پروفایل قابل بازگشت نیست.\n\n` +
      `آیا مطمئن هستی؟`;

    if (!window.confirm(message)) return;

    try {
      if (typeof window.dbRequest !== "function") {
        throw new Error("dbRequest is not available");
      }

      await window.dbRequest("profiles/" + id, "DELETE");

      if (Array.isArray(window.profiles)) {
        window.profiles = window.profiles.filter(x => x.id !== id);
      }

      if (window.selectedProfileId === id) {
        window.selectedProfileId = null;
      }

      if (typeof window.renderAll === "function") {
        window.renderAll();
      }

      if (typeof window.toast === "function") {
        window.toast("پروفایل با موفقیت حذف شد.");
      } else {
        alert("پروفایل با موفقیت حذف شد.");
      }
    } catch (error) {
      console.error(error);

      if (typeof window.toast === "function") {
        window.toast("حذف پروفایل انجام نشد.");
      } else {
        alert("حذف پروفایل انجام نشد.");
      }
    }
  };

  function profileLabelSafe(p) {
    if (typeof window.profileLabel === "function") {
      return window.profileLabel(p);
    }

    return `${p.firstName || ""} ${p.lastName || ""}`.trim() || "مشتری";
  }
})();
