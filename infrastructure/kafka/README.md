# Kafka

The local single-node KRaft broker is configured in the root `docker-compose.yml` using the official `apache/kafka` image. Backend containers connect to `kafka:19092`; host tools connect to `localhost:9092`. Topic definitions and service consumers will be added with the event-driven feature increments.
