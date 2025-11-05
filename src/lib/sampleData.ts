import { supabase } from './supabase';
import { format, addDays } from 'date-fns';

export async function createSampleData() {
  try {
    const { data: existingTasks } = await supabase.from('tasks').select('id').limit(1);

    if (existingTasks && existingTasks.length > 0) {
      console.log('Sample data already exists');
      return;
    }

    const { data: tags } = await supabase.from('tags').select('*');
    const { data: divisions } = await supabase.from('divisions').select('*');

    if (!tags || !divisions) {
      console.error('Tags or divisions not found');
      return;
    }

    const sampleTasks = [
      {
        title: 'Design new landing page',
        description: 'Create modern, responsive landing page with hero section and feature highlights',
        lane: 'red',
        progress_state: 'not_started',
        assignee: 'Sarah Chen',
        due_date: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
        order_rank: 1000,
      },
      {
        title: 'Implement user authentication',
        description: 'Set up secure login system with email/password and social auth',
        lane: 'red',
        progress_state: 'working',
        assignee: 'Mike Rodriguez',
        due_date: format(addDays(new Date(), 5), 'yyyy-MM-dd'),
        order_rank: 2000,
      },
      {
        title: 'Review Q4 marketing strategy',
        description: 'Analyze performance metrics and plan next quarter campaigns',
        lane: 'yellow',
        progress_state: 'needs_review',
        assignee: 'Emma Wilson',
        due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        order_rank: 1000,
      },
      {
        title: 'Update documentation',
        description: 'Add API endpoints documentation and usage examples',
        lane: 'green',
        progress_state: 'completed',
        assignee: 'Alex Kim',
        due_date: format(addDays(new Date(), -2), 'yyyy-MM-dd'),
        order_rank: 1000,
        completed_at: new Date().toISOString(),
      },
      {
        title: 'Bug fix: mobile navigation',
        description: 'Fix hamburger menu not closing on mobile devices',
        lane: 'red',
        progress_state: 'blocked',
        assignee: 'Jordan Lee',
        due_date: format(addDays(new Date(), 2), 'yyyy-MM-dd'),
        order_rank: 3000,
      },
    ];

    for (const task of sampleTasks) {
      const { data: createdTask } = await supabase
        .from('tasks')
        .insert(task)
        .select()
        .single();

      if (createdTask && tags.length > 0) {
        const randomTag = tags[Math.floor(Math.random() * tags.length)];
        await supabase.from('task_tags').insert({
          task_id: createdTask.id,
          tag_id: randomTag.id,
        });
      }

      if (createdTask && divisions.length > 0) {
        const randomDivision = divisions[Math.floor(Math.random() * divisions.length)];
        await supabase.from('task_divisions').insert({
          task_id: createdTask.id,
          division_id: randomDivision.id,
        });
      }

      if (createdTask) {
        await supabase.from('subtasks').insert({
          task_id: createdTask.id,
          title: 'Initial setup',
          progress_state: 'completed',
          order_rank: 1000,
        });

        await supabase.from('subtasks').insert({
          task_id: createdTask.id,
          title: 'Review and test',
          progress_state: 'not_started',
          order_rank: 2000,
        });
      }
    }

    const sampleIdeas = [
      {
        title: 'Add dark mode support',
        description: 'Implement theme switcher with dark/light mode preferences',
        status: 'not_addressed',
      },
      {
        title: 'Mobile app development',
        description: 'Create native mobile apps for iOS and Android',
        status: 'in_progress',
      },
      {
        title: 'Integration with Slack',
        description: 'Send task notifications directly to Slack channels',
        status: 'not_addressed',
      },
    ];

    for (const idea of sampleIdeas) {
      await supabase.from('ideas').insert(idea);
    }

    console.log('Sample data created successfully!');
  } catch (error) {
    console.error('Error creating sample data:', error);
  }
}
