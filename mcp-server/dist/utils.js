export function formatTask(task) {
    const lines = [];
    const status = task.status === "done" ? "[x]" : "[ ]";
    lines.push(`${status} **${task.title}** (${task.id.slice(0, 8)})`);
    if (task.description)
        lines.push(`  ${task.description}`);
    if (task.priority !== "none")
        lines.push(`  Priority: ${task.priority}`);
    if (task.project)
        lines.push(`  Project: ${task.project.name}`);
    if (task.timeBlock !== "unscheduled")
        lines.push(`  Time block: ${task.timeBlock}`);
    if (task.startDate)
        lines.push(`  Start: ${task.startDate}`);
    if (task.dueDate)
        lines.push(`  Due: ${task.dueDate}`);
    if (task.estimatedMinutes)
        lines.push(`  Estimate: ${task.estimatedMinutes}min`);
    if (task.taskLabels?.length)
        lines.push(`  Labels: ${task.taskLabels.map((tl) => tl.label.name).join(", ")}`);
    if (task.subtasks?.length) {
        const done = task.subtasks.filter((s) => s.status === "done").length;
        lines.push(`  Subtasks: ${done}/${task.subtasks.length} done`);
    }
    return lines.join("\n");
}
export function formatTaskList(tasks, heading) {
    if (tasks.length === 0)
        return heading ? `## ${heading}\nNo tasks.` : "No tasks.";
    const lines = heading ? [`## ${heading}`, ""] : [];
    for (const task of tasks) {
        lines.push(formatTask(task));
        lines.push("");
    }
    return lines.join("\n");
}
export function formatGroupedTasks(grouped) {
    const blockNames = {
        morning: "Morning",
        afternoon: "Afternoon",
        evening: "Evening",
        unscheduled: "Unscheduled",
    };
    const sections = [];
    for (const block of [
        "morning",
        "afternoon",
        "evening",
        "unscheduled",
    ]) {
        const tasks = grouped[block];
        if (tasks.length > 0) {
            sections.push(formatTaskList(tasks, blockNames[block]));
        }
    }
    return sections.length > 0 ? sections.join("\n") : "No tasks for today.";
}
export function getToday() {
    return new Date().toISOString().split("T")[0];
}
//# sourceMappingURL=utils.js.map