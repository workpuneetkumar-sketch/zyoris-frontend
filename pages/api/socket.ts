import { Server as ServerIO } from "socket.io";
import { NextApiRequest } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default function SocketHandler(req: NextApiRequest, res: any) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new ServerIO(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: "*",
      },
    });
    res.socket.server.io = io;
    
    // In-memory chat history for cross-browser local testing
    res.socket.server.chatHistory = res.socket.server.chatHistory || [];

    io.on("connection", (socket) => {
      console.log("Client connected", socket.id);

      socket.on("sendMessage", (msg) => {
        if (!msg.createdAt) msg.createdAt = new Date().toISOString();
        if (!msg.id) msg.id = `msg-${Date.now()}-${Math.random()}`;
        
        res.socket.server.chatHistory.push(msg);
        // Broadcast the message to all other connected clients
        socket.broadcast.emit("newMessage", msg);
      });

      socket.on("fetchHistory", (data) => {
        const { user1, user2 } = data;
        if (!user1 || !user2) return;
        
        const history = res.socket.server.chatHistory.filter((m: any) => 
            (m.senderId === user1 && m.receiverId === user2) ||
            (m.senderId === user2 && m.receiverId === user1)
        );
        socket.emit("historyResponse", { user1, user2, history });
      });

      socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
      });
    });
  }
  res.end();
}
