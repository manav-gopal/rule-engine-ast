import mongoose from 'mongoose';

const connection : {isConnected?: number} = {}

async function dbConnect() {
  if (connection.isConnected) return;
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connection status:', db.connections[0]?.readyState);
    connection.isConnected = db.connections[0]?.readyState;
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
  
};

export default dbConnect;
