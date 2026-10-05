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
    
    io.on("connection", (socket) => {
      console.log("Client connected", socket.id);

      socket.on("sendMessage", (msg) => {
        if (!msg.createdAt) msg.createdAt = new Date().toISOString();
        if (!msg.id) msg.id = `msg-${Date.now()}-${Math.random()}`;
        
        // Broadcast message to other connected clients without storing permanent mock state
        socket.broadcast.emit("newMessage", msg);
      });

      socket.on("fetchHistory", (data) => {
        // Mock history removed in favor of backend authority
        socket.emit("historyResponse", { ...data, history: [] });
      });


      socket.on("disconnect", () => {
        console.log("Client disconnected", socket.id);
      });
    });
  }
  res.end();
}
