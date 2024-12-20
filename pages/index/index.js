// index.js
const defaultAvatarUrl = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

Page({
  data: {
    properties: [],
    groupedProperties: [],
    isAddModalVisible: false,
    statusOptions: ['Unavailable', 'Using', 'Retired'],
    selectedStatus: 0,
    beginDate: '',
    categories: ['Clothes', 'Life', 'Electronic', 'Application', 'Food', 'Work', 'Toys', 'Tools', 'Others'],
    selectedCategory: 8,
    filterCategory: '',
    totalUsingCount: 0,
    totalAverageCostSum: 0,
    totalCostSum: 0,
  },

  onLoad() {
    this.loadProperties();
  },

  loadProperties() {
    const properties = wx.getStorageSync('properties') || [];
    this.setData({ properties });
    this.groupProperties(properties);
    this.calculateTotals(properties);
  },

  groupProperties(properties) {
    const grouped = this.data.categories.map(category => {
      const categoryProperties = properties.filter(property => property.category === category);
      const usingProperties = categoryProperties.filter(property => property.status === 'Using');
      const totalAverageCost = usingProperties.reduce((sum, property) => {
        const averageCost = this.calculateAverageCost(property.totalCost, property.beginDate);
        return sum + parseFloat(averageCost);
      }, 0);

      return {
        category,
        properties: categoryProperties.map(property => ({
          ...property,
          daysUsed: this.calculateDaysUsed(property.beginDate),
          averageCost: this.calculateAverageCost(property.totalCost, property.beginDate)
        })),
        usingCount: usingProperties.length,
        totalAverageCost: totalAverageCost.toFixed(2)
      };
    }).filter(group => group.properties.length > 0);

    this.setData({ groupedProperties: grouped });
  },

  calculateTotals(properties) {
    const totalUsingCount = properties.filter(property => property.status === 'Using').length;
    const totalAverageCostSum = properties.reduce((sum, property) => {
      const averageCost = this.calculateAverageCost(property.totalCost, property.beginDate);
      return sum + parseFloat(averageCost);
    }, 0);
    const totalCostSum = properties.reduce((sum, property) => sum + parseFloat(property.totalCost), 0);

    this.setData({
      totalUsingCount,
      totalAverageCostSum: totalAverageCostSum.toFixed(2),
      totalCostSum: totalCostSum.toFixed(2)
    });
  },

  filterProperties(category) {
    const properties = wx.getStorageSync('properties') || [];
    const filtered = category ? properties.filter(p => p.category === category) : properties;
    this.groupProperties(filtered);
  },

  onFilterChange(e) {
    const category = this.data.categories[e.detail.value];
    this.setData({ filterCategory: category });
    this.filterProperties(category);
  },

  showAddModal() {
    this.setData({ isAddModalVisible: true });
  },

  closeModal() {
    this.setData({ isAddModalVisible: false });
  },

  onDateChange(e) {
    this.setData({
      beginDate: e.detail.value
    });
  },

  onCategoryChange(e) {
    this.setData({
      selectedCategory: e.detail.value
    });
  },

  onStatusChange(e) {
    this.setData({
      selectedStatus: e.detail.value
    });
  },

  editProperty(e) {
    const index = e.currentTarget.dataset.index;
    const property = this.data.properties[index];
    console.log('🚀-  -> editProperty  -> editProperty:', property)
    
    this.setData({
      isAddModalVisible: true,
      editingIndex: index,
      beginDate: property.beginDate,
      selectedCategory: this.data.categories.indexOf(property.category),
      selectedStatus: this.data.statusOptions.indexOf(property.status),
      formData: {
        name: property.name,
        totalCost: property.totalCost
      }
    });
  },

  addProperty(event) {
    const formData = event.detail.value;
    const { name, totalCost } = formData;
    const { beginDate, categories, selectedCategory, statusOptions, selectedStatus, editingIndex } = this.data;

    if (!name || !totalCost || !beginDate) {
      wx.showToast({
        title: 'Please fill all fields',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    const currentTime = new Date().getTime(); // Current timestamp

    const newProperty = {
      ...formData,
      category: categories[selectedCategory],
      beginDate,
      status: statusOptions[selectedStatus],
      averageCost: this.calculateAverageCost(totalCost, beginDate),
      createdAt: editingIndex !== undefined ? this.data.properties[editingIndex].createdAt : currentTime, // Use existing or new timestamp
      updatedAt: currentTime // Always update the timestamp
    };

    const properties = [...this.data.properties];

    if (editingIndex !== undefined) {
      properties[editingIndex] = newProperty;
    } else {
      properties.push(newProperty);
    }

    wx.setStorageSync('properties', properties);

    // Update state and regroup properties
    this.setData({
      properties
    });
    this.groupProperties(properties);

    // Reset form fields and state
    this.setData({
      isAddModalVisible: false,
      beginDate: '',
      selectedCategory: 8,
      selectedStatus: 0,
      editingIndex: undefined,
      formData: {} // Clear form data
    });

    // Optionally, reset form inputs if needed
    event.detail.value.name = '';
    event.detail.value.totalCost = '';
  },

  calculateDaysUsed(beginDate) {
    const startDate = new Date(beginDate);
    const currentDate = new Date();
    const daysUsed = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
    return daysUsed > 0 ? daysUsed : 1; // Ensure at least 1 day is counted
  },

  calculateAverageCost(totalCost, beginDate) {
    const daysUsed = this.calculateDaysUsed(beginDate);
    return (totalCost / daysUsed).toFixed(2);
  }
});
