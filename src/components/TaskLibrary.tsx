import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Plus,
  Filter,
  TrendingUp,
  Star,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import {
  loadTaskTemplates,
  getTaskCategories,
  incrementTaskUsage,
  searchTaskTemplates,
  saveTaskTemplate,
  deleteTaskTemplate,
  TaskTemplate,
} from '../services/taskLibraryService';
import { labourRatesService, LabourRate } from '../services/labourRatesService';
import { useToast } from '../context/ToastContext';

interface TaskLibraryProps {
  onClose: () => void;
  onSelectTasks: (tasks: any[]) => void;
}

export default function TaskLibrary({
  onClose,
  onSelectTasks,
}: TaskLibraryProps) {
  const [tasks, setTasks] = useState<TaskTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [labourRates, setLabourRates] = useState<LabourRate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'popular' | 'name'>('popular');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    category: '',
    frequency: 'Monthly',
    hours: 0,
    noOfMen: 1,
    noOfVisits: 1,
    consumables: 0,
    ohpConsumables: 0,
    materialsPlantHire: 0,
    ohpMaterialsPlantHire: 0,
    subcontractor: 0,
    ohpSubcontractor: 0,
    laboratoryTesting: 0,
    ohpLaboratoryTesting: 0,
    adminMarkup: 0,
    otPremium: 0,
    labourType: '',
    band: 'R1',
    notes: '',
    isPublic: false,
  });
  const { showToast, confirm } = useToast();

  useEffect(() => {
    loadData();
  }, [selectedCategory]);

  useEffect(() => {
    if (searchQuery.trim()) {
      handleSearch();
    } else {
      loadData();
    }
  }, [searchQuery]);

  async function loadData() {
    setLoading(true);
    const [{ data, error }, { data: cats }, { data: rates }] = await Promise.all([
      loadTaskTemplates(selectedCategory === 'All' ? undefined : selectedCategory),
      getTaskCategories(),
      labourRatesService.getLabourRates(),
    ]);

    if (error) {
      showToast(error.message, 'error');
    } else {
      setTasks(data);
    }

    setCategories(['All', ...(cats || [])]);

    if (rates && rates.length > 0) {
      setLabourRates(rates);
      setNewTask(prev => ({ ...prev, labourType: prev.labourType || rates[0].name }));
    }

    setLoading(false);
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }

    setLoading(true);
    const { data, error } = await searchTaskTemplates(searchQuery);
    if (error) {
      showToast(error.message, 'error');
    } else {
      setTasks(data);
    }
    setLoading(false);
  }

  async function handleDeleteTask(taskId: string, taskName: string, e: React.MouseEvent) {
    e.stopPropagation();

    const confirmed = await confirm(`Are you sure you want to delete "${taskName}"?`);
    if (!confirmed) return;

    const { error } = await deleteTaskTemplate(taskId);
    if (error) {
      showToast('Failed to delete task: ' + error.message, 'error');
    } else {
      showToast('Task deleted successfully', 'success');
      loadData();
    }
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'popular') {
      return b.usage_count - a.usage_count;
    }
    return a.name.localeCompare(b.name);
  });

  function toggleTaskSelection(taskId: string) {
    const newSelection = new Set(selectedTasks);
    if (newSelection.has(taskId)) {
      newSelection.delete(taskId);
    } else {
      newSelection.add(taskId);
    }
    setSelectedTasks(newSelection);
  }

  function handleAddTasks() {
    const selectedTaskData = tasks
      .filter((task) => selectedTasks.has(task.id))
      .map((task) => ({
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        taskName: task.name,
        frequency: task.template_data?.frequency || 'Monthly',
        hours: task.template_data?.hours || 0,
        noOfMen: task.template_data?.noOfMen || 1,
        noOfVisits: task.template_data?.noOfVisits || 1,
        consumables: task.template_data?.consumables || 0,
        ohpConsumables: task.template_data?.ohpConsumables || 0,
        materialsPlantHire: task.template_data?.materialsPlantHire || 0,
        ohpMaterialsPlantHire: task.template_data?.ohpMaterialsPlantHire || 0,
        subcontractor: task.template_data?.subcontractor || 0,
        ohpSubcontractor: task.template_data?.ohpSubcontractor || 0,
        laboratoryTesting: task.template_data?.laboratoryTesting || 0,
        ohpLaboratoryTesting: task.template_data?.ohpLaboratoryTesting || 0,
        adminMarkup: task.template_data?.adminMarkup || 0,
        otPremium: task.template_data?.otPremium || 0,
        labourType: task.template_data?.labourType || 'Builder',
        band: task.template_data?.band || 'R1',
        notes: task.template_data?.notes || '',
      }));

    selectedTaskData.forEach((task) => {
      const templateId = tasks.find((t) => t.name === task.taskName)?.id;
      if (templateId) {
        incrementTaskUsage(templateId);
      }
    });

    onSelectTasks(selectedTaskData);
    showToast(`Added ${selectedTaskData.length} task(s) to proposal`, 'success');
    onClose();
  }

  async function handleCreateTask() {
    if (!newTask.name.trim()) {
      showToast('Please enter a task name', 'error');
      return;
    }

    if (!newTask.category.trim()) {
      showToast('Please enter a category', 'error');
      return;
    }

    const templateData = {
      frequency: newTask.frequency,
      hours: newTask.hours,
      noOfMen: newTask.noOfMen,
      noOfVisits: newTask.noOfVisits,
      consumables: newTask.consumables,
      ohpConsumables: newTask.ohpConsumables,
      materialsPlantHire: newTask.materialsPlantHire,
      ohpMaterialsPlantHire: newTask.ohpMaterialsPlantHire,
      subcontractor: newTask.subcontractor,
      ohpSubcontractor: newTask.ohpSubcontractor,
      laboratoryTesting: newTask.laboratoryTesting,
      ohpLaboratoryTesting: newTask.ohpLaboratoryTesting,
      adminMarkup: newTask.adminMarkup,
      otPremium: newTask.otPremium,
      labourType: newTask.labourType,
      band: newTask.band,
      notes: newTask.notes,
    };

    const { data, error } = await saveTaskTemplate(
      newTask.name,
      newTask.description,
      newTask.category,
      templateData,
      newTask.isPublic
    );

    if (error) {
      showToast('Failed to create task: ' + error.message, 'error');
    } else {
      showToast('Task created successfully!', 'success');
      setShowCreateModal(false);
      setNewTask({
        name: '',
        description: '',
        category: '',
        frequency: 'Monthly',
        hours: 0,
        noOfMen: 1,
        noOfVisits: 1,
        consumables: 0,
        ohpConsumables: 0,
        materialsPlantHire: 0,
        ohpMaterialsPlantHire: 0,
        subcontractor: 0,
        ohpSubcontractor: 0,
        laboratoryTesting: 0,
        ohpLaboratoryTesting: 0,
        adminMarkup: 0,
        otPremium: 0,
        labourType: labourRates[0]?.name || '',
        band: 'R1',
        notes: '',
        isPublic: false,
      });
      loadData();
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">Task Library</h2>
            {selectedTasks.size > 0 && (
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {selectedTasks.size} selected
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Task
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 border-b bg-gray-50">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'popular' | 'name')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="popular">Most Popular</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {selectedTasks.size > 0 && (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <span className="text-sm text-blue-900">
                {selectedTasks.size} task(s) ready to add
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedTasks(new Set())}
                  className="px-3 py-1 text-sm text-blue-700 hover:text-blue-900"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleAddTasks}
                  className="px-4 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Add to Proposal
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading tasks...</p>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No tasks found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedTasks.has(task.id)
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedTasks.has(task.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedTasks.has(task.id) && (
                        <CheckSquare className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {task.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {task.is_public && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          <button
                            onClick={(e) => handleDeleteTask(task.id, task.name, e)}
                            className="text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        {task.description}
                      </p>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                          {task.category}
                        </span>
                        {task.template_data?.frequency && (
                          <span className="inline-block px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            {task.template_data.frequency}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          {task.template_data?.hours ? (
                            <span>{task.template_data.hours}h</span>
                          ) : null}
                          {task.template_data?.labourType && (
                            <span>{task.template_data.labourType}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span>Used {task.usage_count} times</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-4 bg-gray-50 flex justify-between items-center">
          <span className="text-sm text-gray-600">
            {sortedTasks.length} task{sortedTasks.length !== 1 ? 's' : ''}{' '}
            available
          </span>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            {selectedTasks.size > 0 && (
              <button
                onClick={handleAddTasks}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add {selectedTasks.size} Task{selectedTasks.size !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 60 }}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Create New Task</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., HVAC Filter Replacement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Describe the task..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTask.category}
                      onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., HVAC"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={newTask.frequency}
                      onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Weekly">Weekly</option>
                      <option value="Fortnightly">Fortnightly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Bi-Annually">Bi-Annually</option>
                      <option value="Annually">Annually</option>
                      <option value="Ad-Hoc">Ad-Hoc</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hours
                    </label>
                    <input
                      type="number"
                      value={newTask.hours}
                      onChange={(e) => setNewTask({ ...newTask, hours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.5"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No. of Men
                    </label>
                    <input
                      type="number"
                      value={newTask.noOfMen}
                      onChange={(e) => setNewTask({ ...newTask, noOfMen: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      No. of Visits
                    </label>
                    <input
                      type="number"
                      value={newTask.noOfVisits}
                      onChange={(e) => setNewTask({ ...newTask, noOfVisits: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      step="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Markup %
                    </label>
                    <input
                      type="number"
                      value={newTask.adminMarkup}
                      onChange={(e) => setNewTask({ ...newTask, adminMarkup: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Consumables</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consumables (£)
                      </label>
                      <input
                        type="number"
                        value={newTask.consumables}
                        onChange={(e) => setNewTask({ ...newTask, consumables: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OH&P %
                      </label>
                      <input
                        type="number"
                        value={newTask.ohpConsumables}
                        onChange={(e) => setNewTask({ ...newTask, ohpConsumables: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Materials/Plant Hire</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Materials/Plant Hire (£)
                      </label>
                      <input
                        type="number"
                        value={newTask.materialsPlantHire}
                        onChange={(e) => setNewTask({ ...newTask, materialsPlantHire: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OH&P %
                      </label>
                      <input
                        type="number"
                        value={newTask.ohpMaterialsPlantHire}
                        onChange={(e) => setNewTask({ ...newTask, ohpMaterialsPlantHire: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Subcontractor</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Subcontractor (£)
                      </label>
                      <input
                        type="number"
                        value={newTask.subcontractor}
                        onChange={(e) => setNewTask({ ...newTask, subcontractor: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OH&P %
                      </label>
                      <input
                        type="number"
                        value={newTask.ohpSubcontractor}
                        onChange={(e) => setNewTask({ ...newTask, ohpSubcontractor: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-gray-700 border-b pb-2">Laboratory Testing</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Laboratory Testing (£)
                      </label>
                      <input
                        type="number"
                        value={newTask.laboratoryTesting}
                        onChange={(e) => setNewTask({ ...newTask, laboratoryTesting: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        OH&P %
                      </label>
                      <input
                        type="number"
                        value={newTask.ohpLaboratoryTesting}
                        onChange={(e) => setNewTask({ ...newTask, ohpLaboratoryTesting: parseFloat(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                        step="0.5"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      OT Premium %
                    </label>
                    <select
                      value={newTask.otPremium}
                      onChange={(e) => setNewTask({ ...newTask, otPremium: parseFloat(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="0">R1 (0%)</option>
                      <option value="150">R2 (150%)</option>
                      <option value="200">R3 (200%)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Labour Type
                    </label>
                    <select
                      value={newTask.labourType}
                      onChange={(e) => setNewTask({ ...newTask, labourType: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {labourRates.map(rate => (
                        <option key={rate.id} value={rate.name}>
                          {rate.name} — £{rate.base_rate.toFixed(2)}/hr
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Band
                    </label>
                    <select
                      value={newTask.band}
                      onChange={(e) => setNewTask({ ...newTask, band: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="R1">R1</option>
                      <option value="R2">R2</option>
                      <option value="R3">R3</option>
                      <option value="R4">R4</option>
                      <option value="R5">R5</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    value={newTask.notes}
                    onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTask.isPublic}
                      onChange={(e) => setNewTask({ ...newTask, isPublic: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Make this task public (visible to all users)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="border-t p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTask}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
