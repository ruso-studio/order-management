import { password, api_creds } from "./cred.js";
const APP_CONFIG = {
  LOGIN_USERNAME: "admin",
  LOGIN_PASSWORD: password,
  COOKIE_NAME: "order_management_auth",
  COOKIE_DAYS: 7,
  SHEET_WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycbzh0cn8VSa2gEEjuAXiq5t3ULJzTctfixyCTGyiwPED5jU3PzuHKiPld1ctzA72JqGSiw/exec",
};
const STEADFAST_API_BASE_URL = "https://portal.packzy.com/api/v1";
const STEADFAST_KEY_STORAGE = {
  api: api_creds.apiKey,
  secret: api_creds.apiSecret,
};

const PRESETS = {
  online: {
    en: "To place an order please provide the following info.\n\nName:\nMobile:\nAddress:\nShoe:\nSize:\nPrice:\nDelivery amount:",
    bn: "অর্ডারটি নিশ্চিত করতে অনুগ্রহ করে নিচের তথ্যগুলো দিন।\n\nনাম:\nমোবাইল:\nঠিকানা:\nজুতা:\nসাইজ:\nদাম:\nডেলিভারি চার্জ:",
  },
  direct: {
    en: "Direct Order\n\nShoe model:\nPrice:",
    bn: "ডিরেক্ট অর্ডার\n\nজুতার মডেল:\nদাম:",
  },
};
const state = {
  orderType: "online",
  presetLanguage: { online: "en", direct: "en" },
  products: [],
  manualType: false,
};
const $ = (id) => document.getElementById(id);
const fields = [
  "name",
  "mobile",
  "address",
  "shoeModel",
  "size",
  "unitPrice",
  "sellingPrice",
  "deliveryCharge",
  "extraCost",
  "parcelId",
  "status",
  "orderId",
  "description",
];

function cookie(name) {
  const item = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}
function setCookie(name, value, days) {
  const expiry = new Date(Date.now() + days * 86400000);
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;
}
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}
function showScreen(id) {
  document
    .querySelectorAll(".screen")
    .forEach((screen) => screen.classList.toggle("active", screen.id === id));
}
function toast(message, type = "success") {
  const node = $("toast");
  node.textContent = message;
  node.className = `toast show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.className = "toast";
  }, 3200);
}
function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );
}

function setOrderType(type, automatic = false) {
  state.orderType = type;
  if (!automatic) state.manualType = true;
  $("onlineTypeBtn").classList.toggle("selected", type === "online");
  $("directTypeBtn").classList.toggle("selected", type === "direct");
  document
    .querySelectorAll("[data-online]")
    .forEach((field) => (field.hidden = type === "direct"));
  const check = $("createSteadfast");
  check.disabled = type === "direct";
  if (type === "direct") {
    check.checked = false;
    ["name", "mobile", "address"].forEach((id) => ($(id).value = ""));
  }
  $("submitOrderBtn").innerHTML =
    `${type === "direct" ? "Save direct sale" : "Save online order"} <span>→</span>`;
}

function renderPresets() {
  $("onlineSnippet").textContent = PRESETS.online[state.presetLanguage.online];
  $("directSnippet").textContent = PRESETS.direct[state.presetLanguage.direct];
  document.querySelectorAll(".language-button").forEach((button) => {
    const language =
      state.presetLanguage[button.dataset.preset] === "en"
        ? "EN · বাংলা"
        : "বাংলা · EN";
    button.textContent = language;
  });
}

async function copyPreset(type, button) {
  try {
    await navigator.clipboard.writeText(
      PRESETS[type][state.presetLanguage[type]],
    );
    const label = button.querySelector("span");
    if (!label) return;
    label.textContent = "Copied";
    setTimeout(() => (label.textContent = "Copy"), 1300);
  } catch (_) {
    toast("Clipboard access is unavailable in this browser.", "error");
  }
}

function applyParsed(parsed) {
  if (!state.manualType) setOrderType(parsed.orderType, true);
  fields.forEach((key) => {
    if (parsed[key] !== undefined && parsed[key] !== "")
      $(key).value = parsed[key];
  });
  delete $("unitPrice").dataset.edited;
  if (parsed.description) $("description").dataset.edited = "true";
  else delete $("description").dataset.edited;
  syncProductPrice(Boolean(parsed.shoeModel));
  updateDescription();
}

function parseMessage() {
  const parsed = window.ORDER_PARSER.parseOrderMessage($("orderInput").value);
  state.manualType = false;
  setOrderType(parsed.orderType, true);
  applyParsed(parsed);
  toast("Message parsed. Review the fields before saving.");
}

function syncProductPrice(force) {
  const selectedName = $("shoeModel").value.trim();
  const match = state.products.find(
    (item) =>
      item.name.trim().toLocaleLowerCase() === selectedName.toLocaleLowerCase(),
  );
  if (match) {
    if (force || !$("unitPrice").dataset.edited)
      $("unitPrice").value = match.price;
    $("unitPrice").dataset.productPrice = match.price;
    updateDescription();
    return;
  }
  if (force) {
    $("unitPrice").value = "";
    delete $("unitPrice").dataset.edited;
  }
  delete $("unitPrice").dataset.productPrice;
  updateDescription();
}

async function loadProducts() {
  $("priceChartStatus").textContent = "";
  try {
    const response = await fetch(
      `${APP_CONFIG.SHEET_WEB_APP_URL}?action=products`,
      { method: "GET", mode: "cors" },
    );
    const data = await response.json();
    if (!response.ok || data.success === false)
      throw new Error(data.message || "Unable to load the price chart.");
    state.products = Array.isArray(data.products) ? data.products : [];
    $("productOptions").innerHTML = state.products
      .map(({ name }) => `<option value="${escapeHtml(name)}"></option>`)
      .join("");
    $("priceChartStatus").textContent = "";
    syncProductPrice(false);
  } catch (error) {
    $("priceChartStatus").textContent = "Unavailable";
  }
}

function collectPayload() {
  const data = Object.fromEntries(
    fields.map((key) => [key, $(key).value.trim()]),
  );
  const match = state.products.find(
    (item) =>
      item.name.trim().toLocaleLowerCase() ===
      data.shoeModel.toLocaleLowerCase(),
  );
  if (
    match &&
    (!$("unitPrice").dataset.edited ||
      Number(data.unitPrice) === Number($("unitPrice").dataset.productPrice))
  )
    data.unitPrice = match.price;
  return {
    ...data,
    orderType: state.orderType,
    createSteadfast: $("createSteadfast").checked,
  };
}

function updateDescription() {
  const field = $("description");
  if (field.dataset.edited) return;
  field.value = [
    $("shoeModel").value.trim() && `Shoe: ${$("shoeModel").value.trim()}`,
    $("size").value.trim() && `Size: ${$("size").value.trim()}`,
    $("unitPrice").value && `Unit price: ${$("unitPrice").value}`,
    $("sellingPrice").value && `Selling price: ${$("sellingPrice").value}`,
    $("deliveryCharge").value && `Delivery: ${$("deliveryCharge").value}`,
    $("extraCost").value && `Extra cost: ${$("extraCost").value}`,
  ].filter(Boolean).join(" | ").slice(0, 255);
}

async function submitOrder(event) {
  event.preventDefault();
  const button = $("submitOrderBtn");
  const payload = collectPayload();
  if (payload.createSteadfast) {
    if (
      !sessionStorage.getItem(STEADFAST_KEY_STORAGE.api) ||
      !sessionStorage.getItem(STEADFAST_KEY_STORAGE.secret)
    ) {
      toast(
        "Add your Steadfast API credentials in Settings before submitting this parcel.",
        "error",
      );
      return;
    }
    if (payload.orderId && (!/^[A-Za-z0-9_-]{1,100}$/.test(payload.orderId))) {
      toast("Invoice must contain only letters, numbers, hyphens, or underscores (max 100 characters).", "error");
      return;
    }
    const missing = [
      ["name", "customer name"],
      ["mobile", "mobile number"],
      ["address", "delivery address"],
    ].find(([key]) => !payload[key]);
    if (missing) {
      toast(`Steadfast parcel needs a ${missing[1]}.`, "error");
      return;
    }
    if (
      payload.sellingPrice === "" ||
      !Number.isFinite(Number(payload.sellingPrice)) ||
      Number(payload.sellingPrice) < 0
    ) {
      toast("Enter a valid selling price before creating a parcel.", "error");
      return;
    }
  }
  button.disabled = true;
  button.textContent = "Saving order…";
  try {
    const result = await postToSheet(payload);
    let parcelResult = null;
    let parcelError = "";
    let sheetSyncError = "";
    if (payload.createSteadfast) {
      try {
        parcelResult = await createParcel(payload, result.orderId);
        try {
          await postToSheet({
            action: "updateParcel",
            row: result.row,
            orderId: result.orderId,
            parcelId: parcelResult.consignmentId,
            status: parcelResult.parcelStatus,
          });
        } catch (error) {
          sheetSyncError = error.message;
        }
      } catch (error) {
        parcelError = error.message;
      }
    }

    $("orderForm").reset();
    $("orderInput").value = "";
    delete $("unitPrice").dataset.edited;
    delete $("description").dataset.edited;
    state.manualType = false;
    setOrderType("online", true);
    syncProductPrice(false);
    if (parcelResult) {
      showParcelModal(parcelResult, sheetSyncError);
    } else if (parcelError) {
      toast(
        `Order ${result.orderId} saved. Parcel creation failed: ${parcelError}`,
        "error",
      );
    } else {
      toast(`Order ${result.orderId} saved.`);
    }
  } catch (error) {
    toast(
      error.message === "Failed to fetch"
        ? "Could not reach the order service. Check the Apps Script URL and deployment."
        : error.message || "Submission failed.",
      "error",
    );
  } finally {
    button.disabled = false;
    button.innerHTML = `${state.orderType === "direct" ? "Save direct sale" : "Save online order"} <span>→</span>`;
  }
}

async function postToSheet(payload) {
  const response = await fetch(APP_CONFIG.SHEET_WEB_APP_URL, {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  const raw = await response.text();
  let result;
  try {
    result = JSON.parse(raw);
  } catch (_) {
    throw new Error(raw || "Unable to parse the Apps Script response.");
  }
  if (!response.ok || !result || result.success === false)
    throw new Error(
      result?.message || "Unable to save order to Google Sheets.",
    );
  return result;
}

async function createParcel(payload, invoice) {
  const apiKey = sessionStorage.getItem(STEADFAST_KEY_STORAGE.api) || "";
  const secretKey = sessionStorage.getItem(STEADFAST_KEY_STORAGE.secret) || "";
  if (!apiKey || !secretKey)
    throw new Error(
      "Add your Steadfast API credentials in Settings before creating a parcel.",
    );
  const digits = (value) =>
    String(value || "")
      .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
      .replace(/\D/g, "");
  let phone = digits(payload.mobile);
  if (/^8801\d{9}$/.test(phone)) phone = `0${phone.slice(3)}`;
  if (!/^01\d{9}$/.test(phone))
    throw new Error(
      "Steadfast requires an 11-digit Bangladesh mobile number beginning with 01.",
    );
  const sellingPrice = Number(payload.sellingPrice);
  const deliveryCharge = Number(payload.deliveryCharge || 0);
  const codAmount = sellingPrice + deliveryCharge;
  if (!Number.isFinite(codAmount) || codAmount < 0 || codAmount > 1000000)
    throw new Error("COD amount must be between 0 and 1,000,000.");
  const order = {
    invoice: String(invoice),
    recipient_name: payload.name.trim().slice(0, 100),
    recipient_phone: phone,
    recipient_address: payload.address.trim().slice(0, 490),
    cod_amount: codAmount,
    item_description: String(payload.description || "").slice(0, 255),
    note: String(payload.note || "").slice(0, 480),
  };
  try {
    const response = await fetch(`${STEADFAST_API_BASE_URL}/create_order`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(order),
    });
    const result = await response.json().catch(() => null);
    const consignment = result?.consignment;
    if (
      !response.ok ||
      Number(result?.status) !== 200 ||
      !consignment?.consignment_id
    ) {
      const errors =
        result?.errors && Object.values(result.errors).flat().join(" ");
      throw new Error(
        errors || result?.message || "Steadfast could not create the parcel.",
      );
    }
    return {
      consignmentId: consignment.consignment_id,
      trackingCode: consignment.tracking_code || "",
      trackingUrl: consignment.tracking_link || "",
      parcelStatus: consignment.status || "",
    };
  } catch (error) {
    if (error.message === "Failed to fetch")
      throw new Error(
        "Could not reach Steadfast directly. Check the browser network/CORS response and try again.",
      );
    throw error;
  }
}

function showParcelModal(parcel, sheetSyncError = "") {
  $("parcelIdValue").textContent = parcel.consignmentId || "—";
  $("trackingCodeValue").textContent = parcel.trackingCode || "—";
  $("parcelTrackingLink").href = parcel.trackingUrl || "#";
  $("parcelTrackingLink").hidden = !parcel.trackingUrl;
  $("parcelSyncMessage").textContent = sheetSyncError
    ? `Parcel created, but its details could not be saved to the order sheet: ${sheetSyncError}`
    : "";
  $("parcelModal").hidden = false;
  $("parcelModalOk").focus();
}

function closeParcelModal() {
  $("parcelModal").hidden = true;
  $("submitOrderBtn").focus();
}

function init() {
  $("loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    if (
      $("username").value.trim() === APP_CONFIG.LOGIN_USERNAME &&
      $("password").value.trim() === APP_CONFIG.LOGIN_PASSWORD
    ) {
      setCookie(APP_CONFIG.COOKIE_NAME, "true", APP_CONFIG.COOKIE_DAYS);
      showScreen("mainScreen");
      loadProducts();
    } else toast("Invalid login details.", "error");
  });
  $("logoutBtn").addEventListener("click", () => {
    deleteCookie(APP_CONFIG.COOKIE_NAME);
    showScreen("loginScreen");
  });
  $("parseButton").addEventListener("click", parseMessage);
  $("orderInput").addEventListener("input", () => {
    const detected = window.ORDER_PARSER.detectOrderType($("orderInput").value);
    state.manualType = false;
    setOrderType(detected, true);
  });
  $("onlineTypeBtn").addEventListener("click", () => setOrderType("online"));
  $("directTypeBtn").addEventListener("click", () => setOrderType("direct"));
  document.querySelectorAll(".language-button").forEach((button) =>
    button.addEventListener("click", () => {
      const key = button.dataset.preset;
      state.presetLanguage[key] =
        state.presetLanguage[key] === "en" ? "bn" : "en";
      renderPresets();
    }),
  );
  document
    .querySelectorAll(".copy-button")
    .forEach((button) =>
      button.addEventListener("click", () =>
        copyPreset(button.dataset.copy, button),
      ),
    );
  $("shoeModel").addEventListener("change", () => syncProductPrice(true));
  $("shoeModel").addEventListener("input", () => syncProductPrice(false));
  ["shoeModel", "size", "unitPrice", "sellingPrice", "deliveryCharge", "extraCost"].forEach((id) => $(id).addEventListener("input", updateDescription));
  $("description").addEventListener("input", () => { $("description").dataset.edited = "true"; });
  $("unitPrice").addEventListener(
    "input",
    () => ($("unitPrice").dataset.edited = "true"),
  );
  $("refreshPrices").addEventListener("click", loadProducts);
  $("settingsBtn").addEventListener("click", openSettings);
  $("settingsCancel").addEventListener("click", closeSettings);
  $("settingsModal").addEventListener("click", (event) => {
    if (event.target === $("settingsModal")) closeSettings();
  });
  $("settingsForm").addEventListener("submit", saveSettings);
  $("orderForm").addEventListener("submit", submitOrder);
  $("parcelModalOk").addEventListener("click", closeParcelModal);
  $("parcelModal").addEventListener("click", (event) => {
    if (event.target === $("parcelModal")) closeParcelModal();
  });
  document.addEventListener("keydown", (event) => {
    if ($("parcelModal").hidden) return;
    if (event.key === "Escape") {
      closeParcelModal();
      return;
    }
    if (event.key === "Tab") {
      const focusable = Array.from(
        $("parcelModal").querySelectorAll("a[href], button:not([disabled])"),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
  renderPresets();
  setOrderType("online", true);
  if (cookie(APP_CONFIG.COOKIE_NAME) === "true") {
    showScreen("mainScreen");
    loadProducts();
  }
}

function openSettings() {
  $("steadfastApiKey").value =
    sessionStorage.getItem(STEADFAST_KEY_STORAGE.api) || "";
  $("steadfastSecretKey").value =
    sessionStorage.getItem(STEADFAST_KEY_STORAGE.secret) || "";
  $("settingsModal").hidden = false;
  $("steadfastApiKey").focus();
}
function closeSettings() {
  $("settingsModal").hidden = true;
  $("settingsBtn").focus();
}
function saveSettings(event) {
  event.preventDefault();
  const apiKey = $("steadfastApiKey").value.trim();
  const secretKey = $("steadfastSecretKey").value.trim();
  if (!apiKey || !secretKey)
    return toast("Enter both Steadfast credentials.", "error");
  sessionStorage.setItem(STEADFAST_KEY_STORAGE.api, apiKey);
  sessionStorage.setItem(STEADFAST_KEY_STORAGE.secret, secretKey);
  closeSettings();
  toast("Steadfast credentials saved for this browser session.");
}
document.addEventListener("DOMContentLoaded", init);
