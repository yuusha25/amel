const mongoose = require("mongoose");

mongoose.connect("mongodb+srv://projectkawaii:kelompok13@cluster0.zyhyr.mongodb.net/")
    .then(() => {
        console.log("mongodb connected");
    })
    .catch(() => {
        console.log("failed to connect");
    });

// User Schema (already exists)
const LoginSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        match: [/\S+@\S+\.\S+/, 'Please enter a valid email address']
    },
    password: {
        type: String,
        required: true
    }
});

// Task Schema (for tasks under each person)
const TaskSchema = new mongoose.Schema({
    task_name: { type: String, required: true },
    due_date: { type: Date },
    done_date: { type: Date },
    status: { type: String, enum: ['done', 'pending'], default: 'pending' },
    is_favorite: { type: Boolean, default: false }
});

// Person Schema (for persons under a group)
const PersonSchema = new mongoose.Schema({
    person_name: { type: String, required: true },
    tasks: [TaskSchema] // Array of tasks
});

// Group Schema (main group container)
const GroupSchema = new mongoose.Schema({
    group_name: { type: String, required: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "datauser", required: true },
    persons: [PersonSchema] // Array of persons
});

// Models
const User = mongoose.model("datauser", LoginSchema);
const Group = mongoose.model("groups", GroupSchema);

module.exports = { User, Group };
