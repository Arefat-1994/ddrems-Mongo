const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { ServiceControl, SystemSchedule, Users } = require('../models');

// ===== SERVICE CONTROL ROUTES =====

// Get all service control rules
router.get('/', async (req, res) => {
  try {
    const controls = await ServiceControl.find().sort({ target_role: 1, service_name: 1 }).lean();
    res.json(controls);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get service status for a specific role (used by frontend to check access)
router.get('/check/:role', async (req, res) => {
  try {
    const { role } = req.params;
    // Find all disabled services for this role or 'all'
    const controls = await ServiceControl.find({
      $or: [{ target_role: role }, { target_role: 'all' }],
      is_disabled: true
    }).lean();

    // Build a map of disabled services
    const disabledServices = {};
    controls.forEach(ctrl => {
      disabledServices[ctrl.service_name] = {
        is_disabled: true,
        reason: ctrl.reason,
        display_message: ctrl.display_message,
        status_type: ctrl.status_type,
        estimated_restore: ctrl.estimated_restore
      };
    });

    res.json({ disabledServices });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create or update a service control rule
router.post('/', async (req, res) => {
  try {
    const { target_role, service_name, is_disabled, reason, display_message, status_type, estimated_restore, disabled_by } = req.body;

    let control = await ServiceControl.findOne({ target_role, service_name });

    if (control) {
      control.is_disabled = is_disabled;
      control.reason = reason || '';
      control.display_message = display_message || 'This service is currently unavailable.';
      control.status_type = status_type || 'unavailable';
      control.estimated_restore = estimated_restore || null;
      control.disabled_by = disabled_by || null;
      control.disabled_at = is_disabled ? new Date() : null;
      control.updated_at = new Date();
      await control.save();
    } else {
      control = await ServiceControl.create({
        target_role,
        service_name,
        is_disabled,
        reason: reason || '',
        display_message: display_message || 'This service is currently unavailable.',
        status_type: status_type || 'unavailable',
        estimated_restore: estimated_restore || null,
        disabled_by: disabled_by || null,
        disabled_at: is_disabled ? new Date() : null,
      });
    }

    res.json({ message: 'Service control updated', success: true, control });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk update service controls
router.post('/bulk', async (req, res) => {
  try {
    const { controls } = req.body; // Array of { target_role, service_name, is_disabled, ... }

    const results = [];
    for (const ctrl of controls) {
      let existing = await ServiceControl.findOne({
        target_role: ctrl.target_role,
        service_name: ctrl.service_name
      });

      if (existing) {
        Object.assign(existing, ctrl, { updated_at: new Date() });
        if (ctrl.is_disabled) existing.disabled_at = new Date();
        await existing.save();
        results.push(existing);
      } else {
        const newCtrl = await ServiceControl.create({
          ...ctrl,
          disabled_at: ctrl.is_disabled ? new Date() : null,
        });
        results.push(newCtrl);
      }
    }

    res.json({ message: 'Bulk update complete', success: true, count: results.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a service control rule (re-enable service)
router.delete('/:id', async (req, res) => {
  try {
    await ServiceControl.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service control removed', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== SYSTEM SCHEDULE ROUTES =====

// Get system schedule
router.get('/schedule', async (req, res) => {
  try {
    let schedule = await SystemSchedule.findOne().lean();
    if (!schedule) {
      schedule = await SystemSchedule.create({
        schedule_type: 'daily',
        is_enabled: false,
        open_time: '08:00',
        close_time: '22:00',
        timezone: 'Africa/Addis_Ababa',
        active_days: [1, 2, 3, 4, 5, 6],
        force_closed: false,
      });
    }
    res.json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update system schedule
router.post('/schedule', async (req, res) => {
  try {
    let schedule = await SystemSchedule.findOne();
    if (schedule) {
      Object.assign(schedule, req.body, { updated_at: new Date() });
      await schedule.save();
    } else {
      schedule = await SystemSchedule.create({ ...req.body });
    }
    res.json({ message: 'Schedule updated', success: true, schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Force close/open the system (immediate toggle)
router.post('/schedule/force-toggle', async (req, res) => {
  try {
    const { force_closed, force_closed_message, modified_by } = req.body;
    let schedule = await SystemSchedule.findOne();
    if (!schedule) {
      schedule = await SystemSchedule.create({
        is_enabled: false,
        force_closed: force_closed,
        force_closed_message: force_closed_message || 'The system is currently closed.',
        modified_by,
      });
    } else {
      schedule.force_closed = force_closed;
      schedule.force_closed_message = force_closed_message || schedule.force_closed_message;
      schedule.modified_by = modified_by;
      schedule.updated_at = new Date();
      await schedule.save();
    }
    res.json({ message: force_closed ? 'System closed' : 'System opened', success: true, schedule });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if system is currently open (used by frontend)
router.get('/schedule/is-open', async (req, res) => {
  try {
    const schedule = await SystemSchedule.findOne().lean();
    if (!schedule || !schedule.is_enabled) {
      // If scheduling is not enabled, check force_closed only
      return res.json({
        is_open: !(schedule?.force_closed),
        message: schedule?.force_closed ? schedule.force_closed_message : '',
        force_closed: schedule?.force_closed || false,
      });
    }

    // Check if force closed
    if (schedule.force_closed) {
      return res.json({
        is_open: false,
        message: schedule.force_closed_message,
        force_closed: true,
      });
    }

    // Check schedule-based availability
    const now = new Date();
    const currentDay = now.getDay();

    // Check if today is an active day
    if (!schedule.active_days.includes(currentDay)) {
      return res.json({
        is_open: false,
        message: 'The system is not available today. Please come back on a scheduled day.',
        schedule_closed: true,
        open_time: schedule.open_time,
        close_time: schedule.close_time,
        active_days: schedule.active_days,
      });
    }

    // Check time window
    const [openHour, openMin] = schedule.open_time.split(':').map(Number);
    const [closeHour, closeMin] = schedule.close_time.split(':').map(Number);
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openHour * 60 + openMin;
    const closeMinutes = closeHour * 60 + closeMin;

    const isWithinHours = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

    res.json({
      is_open: isWithinHours,
      message: isWithinHours ? '' : `The system is closed. Operating hours are ${schedule.open_time} - ${schedule.close_time}.`,
      schedule_closed: !isWithinHours,
      open_time: schedule.open_time,
      close_time: schedule.close_time,
      active_days: schedule.active_days,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
