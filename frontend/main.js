const container = document.getElementById("card-container");
let currentPersonName = "";
let currentPersonElement = "";
let groups = {}; // Menyimpan semua grup dan data orang di dalamnya
let currentGroup = null;
let currentGroupId, currentPersonId;

window.onload = fetchGroups;

document.addEventListener('DOMContentLoaded', function () {
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        console.error('Please login first');
        window.location.href = '/login';
        return;
    }

    const logoutBtn = document.getElementById('logout-btn');

    console.log(logoutBtn);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

function handleLogout() {        
    localStorage.removeItem('user_id');
    window.location.href = '/'; 
}

async function fetchGroups() {
    try {
        // Get the user_id from localStorage
        const userId = localStorage.getItem('user_id');

        // Check if user_id exists in localStorage
        if (!userId) {
            console.error("User ID is not available in localStorage.");
            return;
        }

        // Fetch groups associated with the user_id
        const response = await fetch(`/groups?user_id=${userId}`);
        if (response.ok) {
            const data = await response.json();
            
            const groupSelect = document.getElementById("group-select");
            data.groups.forEach(group => {
                const newOption = document.createElement("option");
                newOption.value = group._id;
                newOption.textContent = group.group_name;
                groupSelect.appendChild(newOption);
            });

            // Get group_id from the URL query parameters
            const urlParams = new URLSearchParams(window.location.search);
            const groupIdFromUrl = urlParams.get('group_id');

            // If a group_id is found in the URL, select that option in the dropdown
            if (groupIdFromUrl) {
                groupSelect.value = groupIdFromUrl;
                changeGroup(groupSelect.value);
            }
        }
    } catch (error) {
        console.error("Error fetching groups:", error);
    }
}

async function addGroup() {
    const groupName = prompt("Enter group name:");
    const userId = localStorage.getItem('user_id');

    if (groupName && !groups[groupName]) {
        try {
            const response = await fetch('/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: groupName, user_id: userId }),
            });

            if (response.ok) {
                const newGroup = await response.json();
                groups[newGroup.name] = []; // Add to local groups object

                // Update UI
                const groupSelect = document.getElementById("group-select");
                const newOption = document.createElement("option");
                newOption.value = newGroup.name;
                newOption.textContent = newGroup.name;
                groupSelect.appendChild(newOption);
            } else {
                alert("Failed to add group!");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        alert("Group name already exists!");
    }
}


function changeGroup() {
    const groupSelect = document.getElementById("group-select");
    currentGroup = groupSelect.value;
    loadGroup(currentGroup);
}

async function loadGroup(groupId) {
    container.innerHTML = ""; // Hapus semua orang yang ada di tampilan
    const data = await getPersonInGroup(groupId);

    if (data.persons.length > 0) {
        data.persons.forEach(person => {
            addPersonCard(person, groupId);
        });
    }
}

function editGroup() {
    const groupSelect = document.getElementById("group-select");
    const oldGroupName = groupSelect.value;

    if (oldGroupName && oldGroupName !== "default") {
        document.getElementById("editGroupName").value = oldGroupName; // Set the input value
        const editGroupModal = new bootstrap.Modal(document.getElementById("editGroupModal"));
        editGroupModal.show();
    } else {
        alert("Please select a group to edit!");
    }
}

function saveEditedGroup() {
    const editedGroupName = document.getElementById("editGroupName").value.trim();
    const groupSelect = document.getElementById("group-select");
    const oldGroupName = groupSelect.value;

    if (editedGroupName && editedGroupName !== oldGroupName) {
        // Check if the new name already exists
        if (groups[editedGroupName]) {
            alert("A group with this name already exists!");
            return;
        }

        // Update group in the list
        groups[editedGroupName] = groups[oldGroupName];
        delete groups[oldGroupName];

        // Update group name in the dropdown
        const option = groupSelect.querySelector(`option[value="${oldGroupName}"]`);
        option.value = editedGroupName;
        option.textContent = editedGroupName;

        // Set the current group to the new name
        groupSelect.value = editedGroupName;
        currentGroup = editedGroupName;

        // Close modal
        const myModal = new bootstrap.Modal(document.getElementById('editGroupModal'));
        myModal.hide();
    } else {
        alert("Please enter a valid group name.");
    }
}

async function deleteGroup() {
    const groupSelect = document.getElementById("group-select");
    const groupName = groupSelect.value;

    if (groupName && groupName !== "default") {
        try {
            const response = await fetch(`/groups/${groupName}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                delete groups[groupName];

                // Remove from UI
                groupSelect.querySelector(`option[value="${groupName}"]`).remove();
                groupSelect.value = "default";
                loadGroup("default");
            } else {
                alert("Failed to delete group!");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        alert("Please select a group to delete!");
    }
}

// Function to open Add Person modal
function addPerson() {
    document.getElementById("personName").value = ""; // Reset input
    const addPersonModal = new bootstrap.Modal(document.getElementById("addPersonModal"));
    addPersonModal.show();
}

function formatDate(date) {
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = String(date.getFullYear()).slice(-2);
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    let seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Function to edit person
async function editPerson(element) {
    // Find the closest person container and get the header
    const header = element.closest(".person-container").querySelector(".person-header");

    // Get the old person name
    const oldPersonName = header.textContent.trim();
    const personId = element.getAttribute("data-id"); // Get person ID from the button data-id
    const groupId = element.getAttribute("data-group-id");

    // Ensure the old name is valid
    if (oldPersonName) {
        // Fill the modal input with the old name
        document.getElementById("editPersonName").value = oldPersonName;

        // Store the element being edited in a global variable
        currentPersonElement = header; 

        // Show the edit modal
        const editPersonModal = new bootstrap.Modal(document.getElementById("editPersonModal"));
        editPersonModal.show();

        // Wait for the user to confirm the edit
        const saveButton = document.getElementById("saveEditedPerson");

        saveButton.onclick = async function () {
            const editedPersonName = document.getElementById("editPersonName").value.trim();

            if (editedPersonName && editedPersonName !== oldPersonName) {
                try {
                    // Make the API call to update the person's name
                    const response = await fetch(`/groups/${groupId}/persons/${personId}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ person_name: editedPersonName })
                    });

                    const result = await response.json();

                    if (result.success) {
                        // Update the person name in the UI
                        header.textContent = editedPersonName;
                        editPersonModal.hide(); // Hide modal on success
                    } else {
                        alert(result.message); // Show error message if API call fails
                    }
                } catch (error) {
                    console.log(error);
                    alert("An error occurred while updating the person.");
                }
            } else {
                alert("Please enter a valid name.");
            }
        };
    } else {
        alert("Invalid person name!");
    }
}

// Function to delete person
async function deletePerson(element) {
    const personId = element.getAttribute("data-id"); // Get person ID from the button data-id
    const groupId = element.getAttribute("data-group-id"); // Get person ID from the button data-id
    const personCard = element.closest('.col-md-4'); // Find the parent card of the person

    try {
        // Make the API call to delete the person
        const response = await fetch(`/groups/${groupId}/persons/${personId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });

        const result = await response.json();

        if (result.success) {
            // Remove the person's card from the UI
            personCard.remove();
        } else {
            alert(result.message); // Show error message if API call fails
        }
    } catch (error) {
        alert("An error occurred while deleting the person.");
    }
}


const getPersonInGroup = async (groupId) => {
    const response = await fetch(`/groups/${groupId}/persons`);
    return await response.json();
};

const getGroupDetail = async (groupId) => {
    const response = await fetch(`/groups/${groupId}`);
    return await response.json();
};

async function saveEditedPerson() {
    const editedPersonName = document.getElementById("editPersonName").value.trim();

    if (editedPersonName && currentPersonElement) {
        const oldPersonName = currentPersonElement.textContent.trim();
        const group = groups[currentGroup];

        if (editedPersonName === oldPersonName) {
            alert("The new name is the same as the current name.");
            return;
        }

        try {
            const personIndex = group.indexOf(oldPersonName);
            if (personIndex !== -1) {
                const response = await fetch(`/groups/${currentGroup}/persons/${oldPersonName}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: editedPersonName }),
                });

                if (response.ok) {
                    group[personIndex] = editedPersonName;
                    currentPersonElement.textContent = editedPersonName;
                    currentPersonName = editedPersonName;

                    bootstrap.Modal.getInstance(document.getElementById("editPersonModal")).hide();
                } else {
                    alert("Failed to update person name!");
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        alert("Please enter a valid person name.");
    }
}

        

// Function to open Add Task modal
function addTask(button) {
    // Extract groupId and personId from button attributes
    currentGroupId = button.getAttribute("data-group-id");
    currentPersonId = button.getAttribute("data-id");

    // Reset input fields
    document.getElementById("taskName").value = "";
    document.getElementById("dueDate").value = "";

    // Show the modal
    const addTaskModal = new bootstrap.Modal(document.getElementById("addTaskModal"));
    addTaskModal.show();
}

async function submitTask() {
    const taskName = document.getElementById("taskName").value.trim();
    const dueDate = document.getElementById("dueDate").value || new Date().toISOString();
    const addToAll = document.getElementById("addToAll").checked; // Check if "Add to All" is checked

    // Validation
    if (!taskName) {
        alert("Please enter a task name.");
        return;
    }

    try {
        // Prepare task data
        const taskData = { task_name: taskName, due_date: dueDate };
        
        if (addToAll) {
            // If "Add to All" is checked, send the task to all persons in the group
            const response = await fetch(`/groups/${currentGroupId}/tasks/add-to-all`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(taskData),
            });

            const result = await response.json();
            if (result.success) {
                alert("Task added to all persons in the group!");
                // reload but add query groupId to url
                window.location.href = `?group_id=${currentGroupId}`;
            } else {
                alert("Failed to add task to all persons.");
            }
        } else {
            // If "Add to All" is not checked, add the task to the selected person only
            const response = await fetch(`/groups/${currentGroupId}/persons/${currentPersonId}/tasks`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(taskData),
            });

            const result = await response.json();
            if (result.success) {
                alert("Task added successfully!");
            } else {
                alert("Failed to add task.");
            }
        }
    } catch (error) {
        console.error("Error adding task:", error);
        alert("An error occurred while adding the task.");
    }

    // Hide the modal
    bootstrap.Modal.getInstance(document.getElementById("addTaskModal")).hide();
}

/**
 * Dynamically adds a new task to the person's task list in the UI.
 */
function addTaskToUI(taskName, dueDate) {
    // Format the due date (optional: format it as needed)
    const formattedDueDate = dueDate ? new Date(dueDate).toLocaleDateString() : "";

    // Task HTML
    const taskHTML = `
    <div class="list-container">
        <div class="task-container">
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div class="task-name">
                    <input type="checkbox"> ${taskName}
                    <span class="due-date text-muted">${formattedDueDate}</span>
                </div>
                <div class="d-flex align-items-center">
                    <button class="btn btn-primary favorite" onclick="toggleFavorite(this)">☆</button>
                    <button class="btn btn-delete delete" onclick="deleteTask(this)"><i class="fas fa-trash"></i></button>
                </div>
            </li>
        </div>        
    </div>
    `;

    // Find the task list for the current person
    const taskList = document.getElementById(`${currentPersonId}-tasks`);

    if (taskList) {
        taskList.insertAdjacentHTML('beforeend', taskHTML);
    } else {
        console.error("Task list not found for person ID:", currentPersonId);
    }
}


// Function to edit person name
function editGroup() {
    const groupSelect = document.getElementById("group-select");
    // Get the selected value (option's value attribute)
    const oldGroupName = groupSelect.value;

    // Get the selected label (option's text content)
    const selectedLabel = groupSelect.options[groupSelect.selectedIndex].text;

    if (selectedLabel && selectedLabel !== "default") {
        document.getElementById("editGroupName").value = selectedLabel; // Set the input value
        const editGroupModal = new bootstrap.Modal(document.getElementById("editGroupModal"));
        editGroupModal.show();
    } else {
        alert("Please select a group to edit!");
    }
}

async function saveEditedGroup() {
    const editedGroupName = document.getElementById("editGroupName").value.trim();
    const groupSelect = document.getElementById("group-select");

    // Extract groupId from the currently selected option's value
    const selectedOption = groupSelect.options[groupSelect.selectedIndex];
    const groupId = selectedOption.value; // Assuming value contains groupId
    const oldGroupName = selectedOption.text;

    console.log("Edited Group Name:", editedGroupName);
    console.log("Old Group Name:", oldGroupName);
    console.log("Group ID:", groupId);

    const currentGroups = Array.from(groupSelect.options).map(option => option.text);

    if (editedGroupName && editedGroupName !== oldGroupName && !currentGroups.includes(editedGroupName)) {
        try {
            // Send PUT request to update group name
            const response = await fetch(`/groups/${groupId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_name: editedGroupName })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Update the option text in the dropdown
                selectedOption.text = editedGroupName;

                alert("Group name updated successfully!");

                // Close the modal
                const myModal = bootstrap.Modal.getInstance(document.getElementById('editGroupModal'));
                myModal.hide();
            } else {
                alert(result.message || "Failed to update group name.");
            }
        } catch (error) {
            console.error("Error updating group:", error);
            alert("An error occurred. Please try again.");
        }
    } else {
        alert("Please enter a valid group name & no duplicate group name.");
    }
}


// Function to delete task
function deleteTask(element) {
    element.closest('.list-container').remove(); // Hapus task
}
   
function isDuplicatePerson(name) {
    return Array.from(container.getElementsByClassName('person-header'))
        .some(header => header.textContent.trim() === name);
}

function isDuplicateTask(personName, taskName) {
    const taskList = document.getElementById(`${personName}-tasks`);
    return Array.from(taskList.getElementsByTagName('task-name'))
        .some(task => task.textContent.trim() === taskName);
}

// Function to save new person from modal
async function savePerson() {
    const personName = document.getElementById("personName").value.trim();
    if (personName && currentGroup) {
        if (isDuplicatePerson(personName)) {
            alert("Person with the same name already exists in this group!");
            return;
        }

        try {
            const response = await fetch(`/groups/${currentGroup}/persons`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ person_name: personName }),
            });

            if (response.ok) {
                loadGroup(currentGroup);
                bootstrap.Modal.getInstance(document.getElementById("addPersonModal")).hide();
            } else {
                alert("Failed to add person!");
            }
        } catch (error) {
            console.error("Error:", error);
        }
    } else {
        alert("Please select a group first!");
    }
}

// Fungsi untuk membuat kartu orang
function addPersonCard(person, groupId = '') {
    const cardHTML = `
        <div class="col-md-4">
            <div class="person-container">
                <!-- Person Header (Clickable to toggle task list visibility) -->
                <div class="person-header" data-bs-toggle="collapse" data-bs-target="#collapse-${person._id}" aria-expanded="false" aria-controls="collapse-${person._id}">
                    ${person.person_name}
                </div>

                <div class="collapse" id="collapse-${person._id}">                
                <!-- Edit and Delete Buttons -->
                <div class="btn-group">
                    <button data-group-id="${groupId}" data-id="${person._id}" class="btn-edit" onclick="editPerson(this)">
                        <i class="fas fa-pencil-alt"></i> Edit
                    </button>
                    <button data-group-id="${groupId}" data-id="${person._id}" class="btn-delete" onclick="deletePerson(this)">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div> 
                </div>

                <!-- Task List with Collapse Class (Initially hidden) -->
                <ul class="list-task task-list" id="${person._id}-tasks">
                    ${generateTaskHTML(person.tasks || [], groupId, person._id)}
                </ul>

                <!-- Add Task Button -->
                <button data-group-id="${groupId}" data-id="${person._id}" class="btn btn-task" onclick="addTask(this)">Add a Task</button>
                </div>            
        </div>
    `;
    container.insertAdjacentHTML('beforeend', cardHTML);
}


/**
 * Generates HTML for tasks dynamically.
 * @param {Array} tasks - List of tasks for the person.
 * @returns {string} HTML string for all tasks.
 */
function generateTaskHTML(tasks, groupId, personId) {
    if (tasks.length === 0) return ''; // No tasks to display

    // Sort tasks: favorites first, then done tasks at the end
    tasks.sort((a, b) => {
        // Sort by favorite first (true > false)
        if (a.is_favorite && !b.is_favorite) return -1;
        if (!a.is_favorite && b.is_favorite) return 1;

        // If both tasks are either favorite or not, sort by status (done last)
        if (a.status === 'done' && b.status !== 'done') return 1;
        if (a.status !== 'done' && b.status === 'done') return -1;

        return 0; // If both are equal, no change in order
    });

    // Map through sorted tasks and generate the HTML
    return tasks.map(task => {
        const formattedDueDate = task.due_date
            ? new Date(task.due_date).toISOString().split('T')[0]
            : ""; // YYYY-MM-DD format
        
        const formattedDoneDate = task.done_date ? new Date(task.done_date).toISOString().split('T')[0] : ""; 

        const isFavorite = task.is_favorite ? "⭐" : "☆"; // Toggle star based on favorite status
        const isChecked = task.status === 'done' ? "checked" : ""; // Checkbox for status

        // Styling for strikethrough, opacity, and overdue tasks
        const isOverdue = task.due_date &&  new Date(task.due_date).toISOString().split('T')[0] < new Date().toISOString().split('T')[0] && task.status !== 'done';
        console.log("is over due", isOverdue)

        const taskCardStyle = `
            ${task.status === 'done' ? "opacity: 0.7;" : ""}
            ${task.status === 'done' ? "text-decoration: line-through; color: gray;" : ""}
            ${isOverdue ? "color: red !important;" : ""}
        `;
        const taskNameStyle = task.status === 'done' ? "text-decoration: line-through; color: gray;" : isOverdue ? "color: red !important;" : ""; // Strike-through for task name if done
        const taskCalendarStyle = isOverdue ? "color: red !important; box-shadow: none;" : ""; // Strike-through for task name if done
        const todayDate = new Date().toISOString().split('T')[0];

        return `
            <div class="list-container" data-task-id="${task._id}" style="${taskCardStyle}">
                <div class="task-container">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div class="task-name" style="${taskNameStyle}">
                            <input type="checkbox" ${isChecked} onchange="toggleTaskStatus('${groupId}', '${personId}', '${task._id}', this)">
                            <div>
                                <div>${task.task_name}</div>                             <!-- Task name -->
                                <div class="due-date text-muted" style="${taskCalendarStyle}">
                                    Due: <input type="date" style="${taskCalendarStyle}" 
                                            value="${formattedDueDate}" 
                                            min="${todayDate}" 
                                            onchange="updateDueDate('${groupId}', '${personId}', '${task._id}', this)">
                                </div>
                                <div class="done-date text-muted" style="font-size: 12px">${formattedDoneDate ? `Done at: ${formattedDoneDate}` : ""}</div>
                            </div>
                        </div>
                        <div class="d-flex align-items-center">
                            <button class="btn btn-primary favorite" onclick="toggleFavorite('${groupId}', '${personId}', '${task._id}', this)">
                                ${isFavorite}
                            </button>
                            <button class="btn-delete calendar" onclick="deleteTask('${groupId}', '${personId}', '${task._id}', this)"><i class="fas fa-trash"></i></button>
                        </div>
                    </li>
                </div>                
            </div>
        `;
    }).join('');
}

// function to toggle status
async function toggleTaskStatus(groupId, personId, taskId, checkbox) {
    const newStatus = checkbox.checked ? 'done' : 'pending';
    const doneDate = checkbox.checked ? new Date() : null;

    try {
        const response = await fetch(`/groups/${groupId}/persons/${personId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus, done_date: doneDate })
        });
        const result = await response.json();

        if (result.success) {
            const taskElement = checkbox.closest('.task-container');
            const taskNameElement = taskElement.querySelector('.task-name div');
            const taskNameElementDiv = taskElement.querySelector('.task-name');
            const listContainer = taskElement.closest('.list-container'); // Find the parent list-container

            // Apply strike-through if status is 'done'
            if (newStatus === 'done') {
                taskNameElement.style.textDecoration = 'line-through';
                taskElement.style.opacity = '0.7';  // Optional: for fading effect
                listContainer.style.opacity = '0.7';  // Reset opacity for the container as well
            } else {
                taskNameElement.style.textDecoration = 'none';
                taskNameElementDiv.style.textDecoration = 'none';
                taskNameElementDiv.style.color = 'black';
                taskElement.style.opacity = '1';  // Reset opacity
                listContainer.style.opacity = '1';  // Reset opacity for the container
                listContainer.style.textDecoration = 'none';
                listContainer.style.color = 'black';
            }

            // Update the done date display
            const doneDateElement = taskElement.querySelector('.done-date');
            if (doneDateElement) {
                doneDateElement.textContent = doneDate ? "Done at: " + doneDate.toLocaleDateString() : "";
            }

            // Reorder tasks: This should be done after the status update.
            reorderTasks(groupId, personId);

            console.log("Task status updated:", newStatus);
        } else {
            alert("Failed to update task status");
        }
    } catch (error) {
        console.error("Error updating task status:", error);
    }
}


// function to toggle favorite
async function toggleFavorite(groupId, personId, taskId, button) {
    const isFavorite = button.innerText === "☆"; // Toggle based on current state

    try {
        const response = await fetch(`/groups/${groupId}/persons/${personId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_favorite: isFavorite })
        });
        const result = await response.json();

        if (result.success) {
            button.innerText = isFavorite ? "⭐" : "☆";
            console.log("Task favorite status updated");

            // Reorder tasks: This should be done after updating the favorite status.
            reorderTasks(groupId, personId);
        } else {
            alert("Failed to update favorite status");
        }
    } catch (error) {
        console.error("Error toggling favorite:", error);
    }
}


function reorderTasks(groupId, personId) {
    console.log(personId);

    const personContainer = document.getElementById(personId + "-tasks");
    const taskElements = Array.from(personContainer.querySelectorAll('.list-container'));
    
    // Sort tasks by favorite first, then done tasks last
    taskElements.sort((a, b) => {
        const aFavorite = a.querySelector('.favorite').innerText === "⭐";
        const bFavorite = b.querySelector('.favorite').innerText === "⭐";
        const aDone = a.querySelector('.task-name input').checked;
        const bDone = b.querySelector('.task-name input').checked;

        // Order: favorite > pending > done
        if (aFavorite && !bFavorite) return -1;  // 'a' is favorite and 'b' is not
        if (!aFavorite && bFavorite) return 1;   // 'b' is favorite and 'a' is not
        if (aDone && !bDone) return 1;           // 'a' is done and 'b' is not
        if (!aDone && bDone) return -1;          // 'b' is done and 'a' is not
        return 0; // no change
    });

    // Reattach the sorted elements
    taskElements.forEach(task => {
        personContainer.appendChild(task); // Reattach the task in new order
    });
}

// function to update due date
async function updateDueDate(groupId, personId, taskId, input) {
    const newDueDate = input.value;

    try {
        const response = await fetch(`/groups/${groupId}/persons/${personId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ due_date: newDueDate })
        });
        const result = await response.json();

        if (result.success) {
            console.log("Due date updated to:", newDueDate);
        } else {
            alert("Failed to update due date");
        }
    } catch (error) {
        console.error("Error updating due date:", error);
    }
}

// function to delete task
async function deleteTask(groupId, personId, taskId, button) {
    try {
        const response = await fetch(`/groups/${groupId}/persons/${personId}/tasks/${taskId}`, {
            method: 'DELETE',
        });
        const result = await response.json();

        if (result.success) {
            button.closest('.list-container').remove(); // Remove task from DOM
            console.log("Task deleted successfully");
        } else {
            alert("Failed to delete task");
        }
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}


// Function to format the date and time as dd/mm/yy hh:mm:ss
function formatDate(date) {
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = String(date.getFullYear()).slice(-2);
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    let seconds = String(date.getSeconds()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// Function to open a date picker and set due date
function openCalendar(element) {
    const parentTask = element.closest('.task-container');
    const dueDateSpan = parentTask.querySelector('.due-date');

    // Buat elemen input dengan type "date"
    const input = document.createElement('input');
    input.type = 'date';
    input.style.position = 'absolute';
    input.style.top = `${element.getBoundingClientRect().top + window.scrollY}px`;
    input.style.left = `${element.getBoundingClientRect().left}px`;
    input.style.zIndex = 9999;

    // Tambahkan elemen input ke dalam body
    document.body.appendChild(input);

    // Fokuskan elemen input untuk langsung membuka date picker
    input.focus();

    // Event listener untuk menangkap tanggal yang dipilih
    input.addEventListener('change', function () {
        const selectedDate = new Date(this.value);
        const formattedDate = selectedDate.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });

        dueDateSpan.textContent = `Due: ${formattedDate}`;
        document.body.removeChild(input); // Hapus elemen input setelah selesai
    });

    // Hapus elemen input jika pengguna mengklik di luar tanpa memilih tanggal
    input.addEventListener('blur', function () {
        document.body.removeChild(input);
    });
}


async function saveGroup() {
    const groupName = document.getElementById("groupName").value.trim();
    const userId = localStorage.getItem("user_id");

    if (!userId) {
        alert("You must be logged in to create a group.");
        return;
    }

    if (groupName) {
        try {
            const response = await fetch("/groups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ group_name: groupName, user_id: userId })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                groups[groupName] = []; // Add locally

                // Add group to dropdown
                const groupSelect = document.getElementById("group-select");
                const newOption = document.createElement("option");
                newOption.value = groupName;
                newOption.textContent = groupName;
                groupSelect.appendChild(newOption);

                bootstrap.Modal.getInstance(document.getElementById("addGroupModal")).hide();
                alert("Group created successfully!");
            } else {
                alert(result.message || "Failed to save group.");
            }
        } catch (error) {
            console.error("Error saving group:", error);
            alert("An error occurred. Please try again.");
        }
    } else {
        alert("Please enter a group name!");
    }
}
