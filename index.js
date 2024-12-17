const express = require("express");
const app = express();
const path = require("path");
const hbs = require("hbs");
const { User, Group } = require("./mongodb");

const templatePath = path.join(__dirname, "./templates");
const frontendPath = path.join(__dirname, "./frontend");

app.use(express.json());
app.set("view engine", "hbs");
app.set("views", templatePath);
app.use(express.urlencoded({ extended: false }));

// Routes for login/signup
app.get("/", (req, res) => res.render("home"));
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

app.use(express.static(frontendPath));

app.post("/signup", async (req, res) => {
    const data = { name: req.body.name, password: req.body.password };
    try {
        const user = await User.create(data);
        res.json({
            success: true,
            message: "Account created successfully! Please log in.",
            user_id: user._id
        });
    } catch (err) {
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
});

app.post("/login", async (req, res) => {
    try {
        const user = await User.findOne({ name: req.body.name });
        if (user && user.password === req.body.password) {
            res.json({
                success: true,
                redirect: "/index.html",
                user_id: user._id
            });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: "An error occurred. Please try again." });
    }
});


// Routes for Group Management
app.get("/groups", async (req, res) => {
    try {
        // Get the user_id from query parameters
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required" });
        }

        // Find groups that are associated with the given user_id
        const groups = await Group.find({ "user_id": userId });  // Assuming `members` is an array of user IDs in the group document
        
        // If no groups are found, return an empty array
        if (groups.length === 0) {
            return res.status(404).json({ success: false, message: "No groups found for this user" });
        }

        res.json({ success: true, groups });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch groups" });
    }
});


app.get("/groups/:groupId", async (req, res) => {
    try {
        // Find the group by ID
        const group = await Group.findById(req.params.groupId);

        // Check if group exists
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        // Return the list of persons
        res.json({ success: true, group: group });
    } catch (err) {
        // Handle errors
        res.status(500).json({ success: false, message: "Failed to retrieve persons", error: err.message });
    }
});

app.post("/groups", async (req, res) => {
    const { group_name, user_id } = req.body;
    try {
        const group = await Group.create({ group_name, user_id });
        res.json({ success: true, group });
    } catch (err) {
        console.log(err)
        res.status(500).json({ success: false, message: "Failed to create group" });
    }
});

app.put("/groups/:groupId", async (req, res) => {
    const { groupId } = req.params;
    try {
        const group = await Group.findByIdAndUpdate(groupId, req.body, { new: true });
        res.json({ success: true, group });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update group" });
    }
});

app.delete("/groups/:groupId", async (req, res) => {
    try {
        await Group.findByIdAndDelete(req.params.groupId);
        res.json({ success: true, message: "Group deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete group" });
    }
});

// Routes for Person Management
app.get("/groups/:groupId/persons", async (req, res) => {
    try {
        // Find the group by ID
        const group = await Group.findById(req.params.groupId);

        // Check if group exists
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        // Return the list of persons
        res.json({ success: true, persons: group?.persons ?? [] });
    } catch (err) {
        // Handle errors
        res.status(500).json({ success: false, message: "Failed to retrieve persons", error: err.message });
    }
});

app.post("/groups/:groupId/persons", async (req, res) => {
    const { person_name } = req.body;
    try {
        const group = await Group.findById(req.params.groupId);
        group.persons.push({ person_name });
        await group.save();
        res.json({ success: true, group });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to add person" });
    }
});

app.put("/groups/:groupId/persons/:personId", async (req, res) => {
    const { groupId, personId } = req.params;
    const { person_name } = req.body; // Extract new person name from request body

    try {
        // Find the group by groupId
        const group = await Group.findById(groupId);

        // Find the person in the group's persons array by personId
        const person = group.persons.id(personId);

        // If person doesn't exist, return error
        if (!person) {
            return res.status(404).json({ success: false, message: "Person not found" });
        }

        // Update the person's name
        person.person_name = person_name;

        // Save the group with the updated person
        await group.save();

        // Return the updated group
        res.json({ success: true, group });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update person name" });
    }
});

app.delete("/groups/:groupId/persons/:personId", async (req, res) => {
    const { groupId, personId } = req.params;

    try {
        // Find the group by groupId
        const group = await Group.findById(groupId);

        // Find the index of the person in the group's persons array by personId
        const personIndex = group.persons.findIndex(person => person._id.toString() === personId);

        // If person doesn't exist, return error
        if (personIndex === -1) {
            return res.status(404).json({ success: false, message: "Person not found" });
        }

        // Remove the person from the array using splice
        group.persons.splice(personIndex, 1);

        // Save the group with the updated persons array
        await group.save();

        // Return a success response
        res.json({ success: true, message: "Person deleted successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false, message: "Failed to delete person" });
    }
});

// Routes for Task Management
app.post("/groups/:groupId/persons/:personId/tasks", async (req, res) => {
    const { task_name, due_date } = req.body;
    try {
        const group = await Group.findById(req.params.groupId);
        const person = group.persons.id(req.params.personId);

        // Create the new task object
        const newTask = { 
            task_name, 
            due_date: due_date ?? new Date(),
            status: 'pending',
            is_favorite: false 
        };

        // Add the task to the person's tasks array
        person.tasks.push(newTask);

        // Save the group and fetch the new task from the array
        await group.save();
        const addedTask = person.tasks[person.tasks.length - 1]; // Last task added

        // Send the newly added task as the response
        res.json({ success: true, group, task: addedTask });
    } catch (err) {
        console.error("Error adding task:", err);
        res.status(500).json({ success: false, message: "Failed to add task" });
    }
});

// Add task to all persons in the group
app.post("/groups/:groupId/tasks/add-to-all", async (req, res) => {
    const { task_name, due_date } = req.body;
    try {
        const group = await Group.findById(req.params.groupId);
        group.persons.forEach(person => {
            person.tasks.push({ task_name, due_date: due_date ?? new Date() });
        });
        await group.save();
        res.json({ success: true, group });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to add task to all persons" });
    }
});

app.put("/groups/:groupId/persons/:personId/tasks/:taskId", async (req, res) => {
    try {
        const group = await Group.findById(req.params.groupId);
        const person = group.persons.id(req.params.personId);
        const task = person.tasks.id(req.params.taskId);
        Object.assign(task, req.body);
        await group.save();
        res.json({ success: true, group });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update task" });
    }
});

// Route to Delete a Task
app.delete("/groups/:groupId/persons/:personId/tasks/:taskId", async (req, res) => {
    try {
        const { groupId, personId, taskId } = req.params;

        // Find the group
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        // Find the person
        const person = group.persons.id(personId);
        if (!person) {
            return res.status(404).json({ success: false, message: "Person not found" });
        }

        // Remove the task
        const taskIndex = person.tasks.findIndex(task => task._id.toString() === taskId);
        if (taskIndex === -1) {
            return res.status(404).json({ success: false, message: "Task not found" });
        }

        person.tasks.splice(taskIndex, 1); // Remove the task from the array

        // Save the updated group
        await group.save();

        // Respond with success
        res.json({ success: true, message: "Task deleted successfully" });
    } catch (err) {
        console.error("Error deleting task:", err);
        res.status(500).json({ success: false, message: "Failed to delete task" });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on port 3000"));
