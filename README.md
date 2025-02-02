# Bilbo Loggins

This project is an exploration into logging and structured logging.

---

## Premisse

Bilbo Loggins will be split into 2 programs.
Bilbo will be responsible for the interaction of the client program where the logging data will be collected.
Loggings will manage the log data access for monitoring, provide a UI for that interaction.
The main idea here is not to produce a high quality competitive logging system, but to learn about logging and learn about building a realiable system using different techniques.

### Bilbo

Bilbo is the core logging system, the idea here is to minimize memory allocations and reduce garbage collection (GC) overhead. Instead of creating a new structured object for every log entry, bilbo will manage its own entry object and recyle it, reseting its fields for every log writen.

It uses field chaining on the interface and manage its fields maintaining a structured nature. It relies on accepting a generic type when creating the logger instance to define the fields and levels of the logger so it has user defined constraint and thus enforces the correct types for each field.

Bilbo automatic manage log files and implements log rotation based on log count, also defined by the user. When initialized, it creates a dedicated folder for rotated log files, which are compressed using 'gzip' to optimize disk usage, this ensures a better disk memory efficiency for stored logs. Logs are currently being compressed syncronously.

Currently, the logger is built to handle only single-threaded environment, so its not reliable to work in a system using worker threads, although it can be used in a way where each thread writes to a separated log file(distinguished by an 'infix' in the filename, e.g.: 'bilbo-infix_here-2025-1-20-1.log'), while this allows for multi-threaded use, using the same file names will corrupt the logs.

#### Bilbo Future

Improved I/O by batching multiple logs into a single I/O write operation, this could be achieved by grouping logs an in memory log storage while waiting for a trigger to perform the I/O write.

I/O fallback(right now failure to write is only ignored) as a security to mitigate logging loss when operating in a high thruput environment, where in this case also having an in memory buffer for logs will lower the pressure in I/O, this will only change the pressure location from I/O to memory but this could be handled by using a ring-buffer, while this resolves the pressure and makes a fallback mechanism its not 100% logging loss proof.

Discart of old stored log, could be achieved by watching the storage folder for old logs and discarting old logs based on the file name yy-mm-dd, by the storage size(that could also be user defined) or amount of compressed files.

Safe multi-threading, there is a consideration on implementing a separated process that communicate with each logger using UNIX socket, since its light weight, reliable and fast, where the process receives log data thru the socket and handles file writes, this approach utilizes the UNIX socket almost as an async queue resolving issues with race condition during file writes, also this approach could utilize batch writes to minimize disk I/O.

### Loggings

UI and monitoring part of the system, it will serve a localhost port with html to display information and data of the log files, a basic monitoring tool for the logs produces by bilbo, where it will have live tail monitoring as well as being able to provide stats about the client program overall.
