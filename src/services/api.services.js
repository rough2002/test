//for clearing all events
export const clearAllEvents = async (headers) => {
  try {
    await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/clear",
      {
        method: "POST",
        headers: headers,
      }
    );
  } catch (error) {
    console.error("Error while clearing the events : ", error);
  }
};

// For clearing task in a list
export const clearAllTasks = async (headers, tasklist) => {
  try {
    await fetch(
      `https://tasks.googleapis.com/tasks/v1/users/@me/lists/${tasklist}`,
      {
        method: "DELETE",
        headers: headers,
      }
    );
  } catch (error) {
    console.error("Error while clearing the tasks : ", error);
  }
};

// get all the taskLists
export const getAllLists = async (headers) => {
  try {
    const response = await fetch(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      {
        method: "GET",
        headers: headers,
      }
    );
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error("Error while clearing the tasks : ", error);
  }
};

// create the tasList
export const createList = async (headers) => {
  try {
    const payload = {
      title: "Driver Tasks",
    };
    const res = await fetch(
      "https://tasks.googleapis.com/tasks/v1/users/@me/lists",
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error("Error while creating the taskList : ", error);
  }
};

export const getDriverTaskListId = async (headers) => {
  const taskLists = await getAllLists(headers);
  const [driverTaskList] = taskLists.filter(
    (list) => list.title === "Driver Tasks"
  );
  if (driverTaskList) {
    return driverTaskList.id;
  } else {
    const newTaskListId = await createList(headers);
    return newTaskListId;
  }
};

export const getUserInfo = async (headers) => {
  try {
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/userinfo/v2/me",
      {
        headers,
      }
    );
    const userInfo = await userInfoResponse.json();
    return userInfo;
  } catch (error) {
    console.error("error getting user info  : ", error);
  }
};

// --------- APIS END -----------

export const processInBatchesWithDelay = async (
  items,
  batchSize,
  delay,
  extendedDelay,
  callback
) => {
  const results = [];
  let requestCount = 0;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(callback));
    results.push(...batchResults);
    requestCount += batch.length;
    if (requestCount >= 10) {
      await new Promise((res) => setTimeout(res, extendedDelay));
      requestCount = 0; // reset the request count after the delay
    } else if (i + batchSize < items.length) {
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  return results;
};
export const createEventsPromises = async (events, headers) => {
  return processInBatchesWithDelay(events, 8, 0, 2000, async (event) => {
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers,
        body: JSON.stringify(event),
      }
    );
    return response.json();
  });
};

export const createTasksPromises = async (tasks, newTaskListId, headers) => {
  return processInBatchesWithDelay(tasks, 1, 1000, 0, async (task) => {
    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${newTaskListId}/tasks`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(task),
      }
    );
    return response.json();
  });
};
