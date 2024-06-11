import {
  clearAllEvents,
  clearAllTasks,
  createEventsPromises,
  createTasksPromises,
  getDriverTaskListId,
  getUserInfo,
} from "./services/api.services";

import {
  constructScheduleMap,
  filteredClients,
  findSlotFrame,
  generateEvents,
  generateTasks,
  joinSlotsWithClient,
} from "./utils/manupulators.utils";

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === "uploadCSV") {
    const csvData = request.data;

    chrome.identity.getAuthToken({ interactive: true }, async function (token) {
      const headers = new Headers({
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
      });
      const user = await getUserInfo(headers);
      if (!user.email.includes("@fuelbuddy")) {
        const tasklistID = await getDriverTaskListId(headers);

        //clearing events & tasks
        await clearAllTasks(headers, tasklistID);
        await clearAllEvents(headers);

        const newTaskListId = await getDriverTaskListId(headers);
        const slotFrame = findSlotFrame(csvData[0], 8); // 8 ->  is the index of Slot-1 column (fixed value)
        const filteredData = filteredClients(csvData); // filter for no adhoc & active
        const slotWithClients = joinSlotsWithClient(filteredData, slotFrame);
        const scheduleMap = constructScheduleMap(slotWithClients.slice(1)); // slicing to remove headers
        const eventsObjects = generateEvents(scheduleMap); // getting event objects
        const taskObjects = generateTasks(eventsObjects); // getting tasks from events

        // creating tasks and events in parallel
        const [taskResults, eventResults] = await Promise.all([
          createTasksPromises(taskObjects, newTaskListId, headers),
          createEventsPromises(eventsObjects, headers),
        ]);
        console.log(taskResults.length + " tasks added.");
        console.log(eventResults.length + " events added.");

        //sending message
        chrome.runtime.sendMessage({ action: "eventsCreated" });
      }
    });
  }
});
