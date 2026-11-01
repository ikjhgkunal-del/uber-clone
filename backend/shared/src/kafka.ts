import { Kafka, logLevel } from "kafkajs";

export function createKafkaClient(clientId: string): Kafka {
  const brokers = (process.env.KAFKA_BROKERS ?? "localhost:9092")
    .split(",")
    .map((broker) => broker.trim())
    .filter(Boolean);

  if (brokers.length === 0) {
    throw new Error("KAFKA_BROKERS must contain at least one broker");
  }

  return new Kafka({ clientId, brokers, logLevel: logLevel.ERROR });
}
