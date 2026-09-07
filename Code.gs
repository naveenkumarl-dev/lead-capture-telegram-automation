function getTelegramChatId() {
  const token = PropertiesService.getScriptProperties()
    .getProperty("BOT_TOKEN");

  if (!token) {
    throw new Error("BOT_TOKEN not found.");
  }

  const url = "https://api.telegram.org/bot" + token + "/getUpdates";
  const response = UrlFetchApp.fetch(url);
  const data = JSON.parse(response.getContentText());
  const updates = data.result || [];

  if (updates.length === 0) {
    throw new Error("Bot-ku Hello message அனுப்பிட்டு மீண்டும் Run பண்ணுங்க.");
  }

  const lastUpdate = updates[updates.length - 1];
  const message = lastUpdate.message || lastUpdate.edited_message;

  if (!message || !message.chat) {
    throw new Error("CHAT_ID கண்டுபிடிக்க முடியவில்லை.");
  }

  console.log("CHAT_ID: " + message.chat.id);
}
function sendTestTelegram() {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty("BOT_TOKEN");
  const chatId = properties.getProperty("CHAT_ID");

  if (!token || !chatId) {
    throw new Error("BOT_TOKEN or CHAT_ID missing.");
  }

  const url = "https://api.telegram.org/bot" + token + "/sendMessage";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text: "✅ NezFlow Telegram API connection is working!"
    })
  });

  console.log(response.getContentText());
}
function submitLead(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = SpreadsheetApp
      .getActiveSpreadsheet()
      .getSheetByName("Leads");

    if (!sheet) {
      throw new Error("Leads sheet not found.");
    }

    const customerName = String(data.customerName || "").trim();
    const mobile = String(data.mobile || "").replace(/\D/g, "");
    const email = String(data.email || "").trim();
    const service = String(data.service || "").trim();
    const source = String(data.source || "Website").trim();
    const notes = String(data.notes || "").trim();

    if (!customerName) {
      throw new Error("Customer name is required.");
    }

    if (!/^\d{10}$/.test(mobile)) {
      throw new Error("Enter a valid 10-digit mobile number.");
    }

    if (!service) {
      throw new Error("Select a service.");
    }

    const rowNumber = Math.max(sheet.getLastRow() + 1, 2);
    const leadId =
      "LEAD-" + Utilities.formatString("%04d", rowNumber - 1);

    const dateTime = new Date();

    sheet.getRange(rowNumber, 1, 1, 10).setValues([[
      leadId,
      dateTime,
      customerName,
      mobile,
      email,
      service,
      source,
      "New",
      "",
      notes
    ]]);

    sheet.getRange(rowNumber, 2)
      .setNumberFormat("dd-mmm-yyyy hh:mm AM/PM");

    let alertSent = true;

    try {
      sendTelegramLeadAlert_({
        leadId,
        customerName,
        mobile,
        email,
        service,
        source,
        notes
      });
    } catch (error) {
      alertSent = false;
      console.error(error);
    }

    return {
      success: true,
      leadId: leadId,
      alertSent: alertSent
    };

  } finally {
    lock.releaseLock();
  }
}


function sendTelegramLeadAlert_(lead) {
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty("BOT_TOKEN");
  const chatId = properties.getProperty("CHAT_ID");

  if (!token || !chatId) {
    throw new Error("Telegram properties are missing.");
  }

  const message = [
    "🔔 NEW LEAD RECEIVED",
    "",
    "Lead ID: " + lead.leadId,
    "Name: " + lead.customerName,
    "Mobile: " + lead.mobile,
    "Email: " + (lead.email || "-"),
    "Service: " + lead.service,
    "Source: " + lead.source,
    "Notes: " + (lead.notes || "-")
  ].join("\n");

  const url =
    "https://api.telegram.org/bot" + token + "/sendMessage";

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      chat_id: chatId,
      text: message
    }),
    muteHttpExceptions: true
  });

  const result = JSON.parse(response.getContentText());

  if (!result.ok) {
    throw new Error(result.description || "Telegram alert failed.");
  }
}


function testLeadSubmission() {
  const result = submitLead({
    customerName: "Test Customer",
    mobile: "9876543210",
    email: "test@example.com",
    service: "Excel Automation",
    source: "Website",
    notes: "API automation test"
  });

  console.log(result);
}
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile("Index")
    .setTitle("NezFlow Lead Enquiry")
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    );
}

