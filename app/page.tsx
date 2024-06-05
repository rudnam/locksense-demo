"use client";
import { useEffect, useState } from "react";
import mqtt, { MqttClient } from "mqtt";
import LockToggle from "./components/LockToggle";

let mqttClient: MqttClient | null = null;

export default function Home() {
  const [isLocked, setIsLocked] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const logInfo = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `INFO: ${message}`]);
    console.log(message);
  };

  const logError = (message: string) => {
    setLogs((prevLogs) => [...prevLogs, `ERROR: ${message}`]);
    console.error(message);
  };

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_MQTT_BROKER_URL) {
      logError("MQTT Broker URL is not defined");
      return;
    }

    logInfo("Connecting to the MQTT server...");
    mqttClient = mqtt.connect(process.env.NEXT_PUBLIC_MQTT_BROKER_URL, {
      clientId: `locksense-demo-lock-${Math.random()
        .toString(16)
        .substr(2, 8)}`,
      username: process.env.NEXT_PUBLIC_MQTT_USERNAME,
      password: process.env.NEXT_PUBLIC_MQTT_PASSWORD,
    });

    mqttClient.on("connect", () => {
      logInfo("Connected to the MQTT server.");
      mqttClient!.subscribe("locks/-NycrH2cYavPQDTVmfKp/command", { qos: 0 });
      logInfo("Subscribed to locks/-NycrH2cYavPQDTVmfKp/command.");
      let message = isLocked ? "locked" : "unlocked";
      mqttClient!.publish(
        "locks/-NycrH2cYavPQDTVmfKp/status",
        message,
        { qos: 0 }
      );
    });

    mqttClient.on("reconnect", () => {
      logInfo("Reconnecting to the MQTT server...");
    });

    mqttClient.on("disconnect", () => {
      logInfo("Disconnected from the MQTT server.");
    });

    mqttClient.on("error", (err) => {
      logError(`Connection error: ${err.message}`);
      mqttClient!.end();
    });

    mqttClient.on("message", (topic, message) => {
      const messageString = message.toString();
      logInfo(`Received "${messageString}" from  ${topic}.`);
      if (topic === "locks/-NycrH2cYavPQDTVmfKp/command") {
        setIsLocked(messageString === "lock");
        logInfo(
          `Successfully ${messageString === "lock" ? "locked" : "unlocked"}!`
        );
        let statusMessage = messageString === "lock" ? "locked" : "unlocked";
        mqttClient!.publish(
          "locks/-NycrH2cYavPQDTVmfKp/status",
          statusMessage,
          { qos: 0 }
        );
        logInfo(
          `Published "${statusMessage}" to locks/-NycrH2cYavPQDTVmfKp/status.`
        );
      }
    });

    return () => {
      if (mqttClient) {
        mqttClient.end();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLock = () => {
    const newLockStatus = !isLocked;
    setIsLocked(newLockStatus);
    if (mqttClient) {
      let message = newLockStatus ? "locked" : "unlocked";
      mqttClient.publish("locks/-NycrH2cYavPQDTVmfKp/status", message, {
        qos: 0,
      });
      logInfo(`Published "${message}" to locks/-NycrH2cYavPQDTVmfKp/status.`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-16 px-4 gap-8 text-center">
      <h1 className="text-3xl">LockSense Smart Lock Simulator</h1>
      <div className="flex flex-col w-full max-w-80 items-center justify-between lg:flex">
        <div className="mt-8 w-full h-16">
          <LockToggle isLocked={isLocked} onChange={toggleLock} />
        </div>
        <h1 className="text-xl mt-12">Lock 1</h1>
      </div>
      <div className="w-full max-w-90 p-4 flex flex-col items-center">
        <h2 className="text-xl">Console Logs</h2>
        <div className="max-h-64 overflow-y-auto p-4 text-left">
          {logs.map((log, index) => (
            <p key={index}>{log}</p>
          ))}
        </div>
      </div>
    </main>
  );
}
