# Bilbo Loggins

This project is an exploration into logging.

---

## Premisse

Bilbo Loggins will be split into 2 programs, Bilbo that is responsible for the interaction of the client program with the logging system and Loggings that will manage the log data access for monitoring and provide a UI for that interaction.
The main idea here is not to produce a competitive logging system, but to learn about logging and learn about building a realiable system using different techniques.

### Bilbo

This is the main part of the system, it will interact with the file system and provide a way to write to the file a structured log, that will be stored in a each line log pattern, from time to time a log rotation will be triggered and bilbo will close and compress the current log file and open a new one in order to maintain storage slim.
There is still space to use sqlite to store the files in a more structured way instead of just compressing them.

### Loggings

UI and monitoring part of the system, it will serve a localhost port with html to display information and data of the log files, a basic monitoring tool for the logs produces by bilbo, where it will have live tail monitoring as well as being able to provide stats about the client program overall.
