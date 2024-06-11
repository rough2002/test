const daysOfWeek = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

export const findSlotFrame = (headings, start) => {
  let end = -1;
  let index = start + 1; // Start from the index next to the known start index
  while (end === -1) {
    if (index >= headings.length) break; // Break the loop if we reach the end of the headings array

    const heading = headings[index].trim();
    if (!heading) {
      end = index; // Update the end index if we found an empty heading
    }
    index++;
  }
  return { start, end };
};

export const filteredClients = (clientsData) => {
  const headers = clientsData.slice(0, 1);
  const filteredClients = clientsData.slice(1).filter((row) => {
    if (!row[1]) return false;
    if (!row[1].trim()) return false;
    const adhoc = row[3] ? row[3].trim().toLowerCase() : "";
    const status = row[4].trim().toLowerCase();
    return (adhoc === "no" || adhoc === "") && status === "active";
  });
  return [...headers, ...filteredClients];
};

export const joinSlotsWithClient = (clients, slotFrame) => {
  const { start, end } = slotFrame;
  const result = clients.map((row) => {
    return [row[0], row[6], ...row.slice(start, end)];
  });
  return result;
};

export const parseSlots = (slot) => {
  const regex =
    /\(?(\d{1,2}:\d{2})\s*[-–—]?\s*(\d{1,2}:\d{2})\)?\s*\(?\s*([^)\n]+)?\)?/;
  const match = slot.match(regex);

  if (match) {
    const startTime = match[1];
    const endTime = match[2];
    const days = match[3]
      ? match[3].split(",").map((day) => day.trim())
      : Object.keys(daysOfWeek); // If no specific days are listed, use all days

    return { startTime, endTime, days };
  } else {
    console.error(slot, "Error happened while detecting slot");
  }
};

export const constructScheduleMap = (result) => {
  const scheduleMap = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };

  result.forEach((row) => {
    const clientName = row[0];
    const description = row[1];
    for (let i = 2; i < row.length; i++) {
      const slot = row[i];
      if (slot.trim()) {
        // Ensure slot is not empty
        const parsedSlot = parseSlots(slot);
        if (parsedSlot) {
          const { startTime, endTime, days } = parsedSlot;

          days.forEach((day) => {
            const fullDay = daysOfWeek[day] || day;
            if (scheduleMap[fullDay]) {
              scheduleMap[fullDay].push({
                startTime,
                endTime,
                clientName,
                description,
              });
            }
          });
        }
      }
    }
  });

  return scheduleMap;
};

export const generateEvents = (scheduleMap) => {
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999); // Set the time to the end of the day to include the last day of the month
  const events = [];
  for (
    let date = new Date(today);
    date <= endOfMonth;
    date.setDate(date.getDate() + 1)
  ) {
    const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
    const slots = scheduleMap[dayName];

    if (slots) {
      slots.forEach((slot) => {
        const { clientName, startTime, endTime, description } = slot;
        const dateStr = date.toISOString().split("T")[0];
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);
        const nextDateStr = nextDate.toISOString().split("T")[0];

        if (Number(startTime.slice(0, 2)) > Number(endTime.slice(0, 2))) {
          events.push({
            summary: clientName,
            description: description,
            start: {
              dateTime: `${dateStr}T${startTime}:00`,
              timeZone: "Asia/Dubai",
            },
            end: {
              dateTime: `${nextDateStr}T${endTime}:00`,
              timeZone: "Asia/Dubai",
            },
          });
        }

        // if the order lies in the present date
        else {
          events.push({
            summary: clientName,
            description: description,
            start: {
              dateTime: `${dateStr}T${startTime}:00`,
              timeZone: "Asia/Dubai",
            },
            end: {
              dateTime: `${dateStr}T${endTime}:00`,
              timeZone: "Asia/Dubai",
            },
          });
        }
      });
    }
  }

  return events;
};

export const generateTasks = (events) => {
  const tasks = events.map((event) => {
    return {
      title: event.summary,
      due: `${event.end.dateTime}+04:00`,
      notes: event.description,
    };
  });
  return tasks;
};
