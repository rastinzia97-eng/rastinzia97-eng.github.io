/* RAEE CAFE — Profile Invoice (Desktop + Mobile)
   این نسخه به متغیرهای داخلی سایت وابسته نیست.
   فقط کارت‌های واقعی پروفایل و جزئیات سفارش نمایش‌داده‌شده توسط سایت را استفاده می‌کند.
*/
(function () {
  "use strict";

  const BUTTON_CLASS = "raee-profile-invoice-btn";

  function addButtons() {
    document.querySelectorAll('button[onclick*="openProfile("]').forEach(function (openBtn) {
      const card = openBtn.closest(".profile-card");
      if (!card || card.querySelector("." + BUTTON_CLASS)) return;

      const match = (openBtn.getAttribute("onclick") || "")
        .match(/openProfile\(\s*['"]([^'"]+)['"]\s*\)/);

      if (!match) return;

      const profileId = match[1];
      const actions = openBtn.closest(".row-actions");

      if (!actions) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn info small " + BUTTON_CLASS;
      btn.textContent = "🧾 چاپ فاکتور پروفایل";

      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        makeProfileInvoice(profileId);
      });

      actions.insertBefore(btn, openBtn.nextSibling);
    });
  }

  function makeProfileInvoice(profileId) {
    if (typeof window.openProfile !== "function") {
      alert("سیستم پروفایل هنوز آماده نشده است. صفحه را یک‌بار تازه‌سازی کن.");
      return;
    }

    /* پروفایل را باز می‌کنیم تا خود سایت سفارش‌های واقعی آن را در DOM بسازد. */
    window.openProfile(profileId);

    setTimeout(function () {
      const detail = document.getElementById("profileDetail");

      if (!detail || detail.classList.contains("hidden")) {
        alert("جزئیات پروفایل پیدا نشد. دوباره امتحان کن.");
        return;
      }

      /*
        هر سفارش در profileDetail یک .order-card است.
        سفارش پرداخت‌نشده badge با کلاس .unpaid دارد.
      */
      const allCards = Array.from(detail.querySelectorAll(".order-card"));

      const unpaidCards = allCards.filter(function (card) {
        return !!card.querySelector(".badge.unpaid");
      });

      if (!unpaidCards.length) {
        alert("این پروفایل هیچ سفارش پرداخت‌نشده‌ای ندارد.");
        return;
      }

      const profileHeader = detail.querySelector(".detail-head");
      const customerName =
        profileHeader?.querySelector("h3")?.textContent?.trim() || "مشتری";

      const contact =
        profileHeader?.querySelector("div div")?.textContent?.trim() || "";

      /*
        کارت‌های سفارش را به یک نسخه تمیز برای چاپ تبدیل می‌کنیم.
        کنترل‌های مدیریتی مثل «ثبت پرداخت» و انتقال سفارش حذف می‌شوند.
      */
      const ordersHtml = unpaidCards.map(function (card) {
        const clone = card.cloneNode(true);

        clone.querySelectorAll("button, select, .transfer-order").forEach(function (el) {
          el.remove();
        });

        clone.classList.remove("debt-high");

        return `<section class="order-card-print">${clone.innerHTML}</section>`;
      }).join("");

      const debtBadge = detail.querySelector(".detail-head .badge.unpaid");
      const debtText = debtBadge ? debtBadge.textContent.trim() : "";

      const popup = window.open("", "_blank");

      if (!popup) {
        alert("پنجره چاپ توسط مرورگر مسدود شده است. Pop-up را برای سایت فعال کن.");
        return;
      }

      popup.document.open();
      popup.document.write(`
<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>فاکتور پروفایل - ${escapeHtml(customerName)}</title>

<style>
*{box-sizing:border-box}

html,body{
  margin:0;
  padding:0;
}

body{
  background:#eee;
  color:#3f3028;
  font-family:Tahoma,Arial,sans-serif;
}

.invoice{
  width:210mm;
  min-height:297mm;
  margin:20px auto;
  padding:16mm;
  background:#fff;
}

.header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:20px;
  border-bottom:2px solid #7b523d;
  padding-bottom:14px;
  margin-bottom:16px;
}

.logo{
  font-family:Georgia,serif;
  font-size:28px;
  font-weight:bold;
  letter-spacing:4px;
}

.title{
  text-align:left;
}

.title h1{
  margin:0 0 6px;
  font-size:22px;
}

.muted{
  color:#777;
  font-size:12px;
}

.customer{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  margin-bottom:16px;
}

.customer-box{
  padding:10px;
  background:#faf6f1;
  border:1px solid #e1d4c8;
  border-radius:9px;
}

.order-card-print{
  background:#fff;
  border:1px solid #d8c7b8;
  border-radius:12px;
  padding:12px;
  margin-bottom:12px;
  page-break-inside:avoid;
}

.order-head{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:flex-start;
  margin-bottom:8px;
}

.order-meta{
  color:#777;
  font-size:12px;
  line-height:1.8;
}

.order-items{
  margin:9px 0;
  padding:9px;
  background:#fbf6ef;
  border-radius:9px;
  line-height:1.9;
}

.row-actions,
.transfer-order,
button,
select{
  display:none !important;
}

.badge.unpaid{
  display:inline-block;
  padding:5px 8px;
  border-radius:999px;
  background:#fff1d9;
  color:#98621c;
  font-size:11px;
}

.order-total{
  display:flex;
  justify-content:space-between;
  margin-top:8px;
  padding:9px;
  background:#faf6f1;
  border-radius:8px;
}

.grand-total{
  display:flex;
  justify-content:space-between;
  margin-top:18px;
  padding:15px;
  background:#f2e6dc;
  border-radius:10px;
  font-size:18px;
  font-weight:bold;
}

.print-button{
  display:block;
  margin:22px auto;
  padding:12px 30px;
  border:0;
  border-radius:9px;
  background:#7b523d;
  color:#fff;
  font-size:16px;
  cursor:pointer;
}

.footer{
  text-align:center;
  margin-top:28px;
  color:#777;
  font-size:12px;
}

@media print{
  body{
    background:#fff;
  }

  .invoice{
    width:210mm;
    min-height:297mm;
    margin:0;
    padding:12mm;
  }

  .print-button{
    display:none !important;
  }
}

@page{
  size:A4;
  margin:0;
}
</style>
</head>

<body>
<div class="invoice">

  <div class="header">
    <div>
      <div class="logo">RAEE CAFE</div>
      <div class="muted">فاکتور حساب مشتری</div>
    </div>

    <div class="title">
      <h1>فاکتور پروفایل</h1>
      <div class="muted">${escapeHtml(new Date().toLocaleString("fa-IR"))}</div>
    </div>
  </div>

  <div class="customer">
    <div class="customer-box">
      <b>مشتری</b><br>
      ${escapeHtml(customerName)}
    </div>

    <div class="customer-box">
      <b>مشخصات</b><br>
      ${escapeHtml(contact)}
    </div>

    <div class="customer-box">
      <b>سفارش‌های پرداخت‌نشده</b><br>
      ${new Intl.NumberFormat("fa-IR").format(unpaidCards.length)} سفارش
    </div>

    <div class="customer-box">
      <b>وضعیت</b><br>
      ${escapeHtml(debtText || "پرداخت‌نشده")}
    </div>
  </div>

  ${ordersHtml}

  <div class="grand-total">
    <span>مجموع بدهی</span>
    <span>${escapeHtml(debtText || "—")}</span>
  </div>

  <button class="print-button" onclick="window.print()">
    🖨 چاپ فاکتور
  </button>

  <div class="footer">
    RAEE CAFE ☕<br>
    از خرید شما سپاسگزاریم
  </div>

</div>
</body>
</html>
      `);

      popup.document.close();
      popup.focus();
    }, 250);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /* برای موبایل و لپ‌تاپ: هر بار که پروفایل‌ها دوباره ساخته شوند، دکمه برمی‌گردد. */
  const observer = new MutationObserver(addButtons);
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  addButtons();
  setTimeout(addButtons, 300);
  setTimeout(addButtons, 1000);
  setTimeout(addButtons, 2500);
  setTimeout(addButtons, 5000);

  window.addEventListener("load", addButtons);
})();
