const fs = require('fs');
const BACKEND_URL = "https://zyoris.onrender.com";

async function checkLiveSession() {
  const creds = JSON.parse(fs.readFileSync('scratch/demo-credentials.json', 'utf8'));
  const token = creds.token;
  const orgId = creds.authSession.user.organizationId;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "x-organization-id": orgId,
  };

  console.log("Checking conversations for org:", orgId);
  const convsRes = await fetch(`${BACKEND_URL}/api/communications/conversations`, { headers });
  console.log("Conversations status:", convsRes.status);
  const convs = await convsRes.json();
  console.log("Existing conversations count:", convs.length);
  if (convs.length > 0) {
    console.log("Sample conversation:", JSON.stringify(convs[0], null, 2));
    const convId = convs[0].id;
    // Get messages
    const msgsRes = await fetch(`${BACKEND_URL}/api/communications/messages?conversationId=${convId}&limit=50`, { headers });
    const msgs = await msgsRes.json();
    console.log("Conversation messages count:", (msgs.data || msgs).length);
    const msgList = msgs.data || msgs;
    if (msgList.length > 0) {
      const msg = msgList[0];
      console.log("Message id:", msg.id, "content:", msg.content);
      // Pin message
      const pinRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/pin`, { method: "POST", headers });
      console.log("Pin message status:", pinRes.status, await pinRes.text());
      // Get conversation pins
      const getPins = await fetch(`${BACKEND_URL}/api/communications/conversations/${convId}/pins`, { headers });
      console.log("Get conversation pins status:", getPins.status, await getPins.text());
      // Save message
      const saveRes = await fetch(`${BACKEND_URL}/api/communications/messages/${msg.id}/save`, { method: "POST", headers });
      console.log("Save message status:", saveRes.status, await saveRes.text());
      // Get saved
      const getSaved = await fetch(`${BACKEND_URL}/api/communications/saved`, { headers });
      console.log("Get saved status:", getSaved.status, await getSaved.text());
    }
  }
}

checkLiveSession().catch(console.error);
