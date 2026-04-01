import { NextResponse } from 'next/server';
import { getTasks, addTask, updateTaskStatus } from '@/lib/notion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tasks = await getTasks();
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { task, description, assignedTo, status, priority, dueDate, category } = body;

    if (!task || !description || !assignedTo || !priority || !dueDate || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await addTask({
      task,
      description,
      assignedTo,
      status,
      priority,
      dueDate,
      category,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error adding task:', error);
    return NextResponse.json(
      { error: 'Failed to add task' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing id or status' },
        { status: 400 }
      );
    }

    const result = await updateTaskStatus(id, status);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating task status:', error);
    return NextResponse.json(
      { error: 'Failed to update task status' },
      { status: 500 }
    );
  }
}
