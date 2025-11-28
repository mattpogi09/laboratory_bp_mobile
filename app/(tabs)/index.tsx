import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Dimensions, Alert 
} from 'react-native';
import { Stack, router } from 'expo-router';
import { 
  Users, AlertTriangle, Clock, 
  Banknote, // Replaces PhilippinePeso
  Menu, LogOut
} from 'lucide-react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import axios from 'axios';
import api from '../services/api'; // Ensure you have this file from previous steps

// Screen Width for Charts
const screenWidth = Dimensions.get("window").width;

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('day');
  
  // Data State
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      // If manually refreshing, don't show full screen loader
      if (!refreshing) setLoading(true);

      // Make sure your api.js has the correct URL (localtunnel or IP)
      const response = await api.get(`/dashboard?period=${period}`);
      setData(response.data);

    } catch (error) {
      console.log("Dashboard Error:", error);
      Alert.alert("Error", "Failed to load dashboard data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [period]); // Reload when period changes

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleLogout = () => {
    // Simple logout for now
    router.replace('/login');
  };

  if (loading && !data) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ac3434" />
      </View>
    );
  }

  // Helper to get stats icon
  const getIcon = (title: string) => {
    if (title.includes('Revenue')) return <Banknote color="white" size={24} />;
    if (title.includes('Patients')) return <Users color="white" size={24} />;
    if (title.includes('Stock')) return <AlertTriangle color="white" size={24} />;
    return <Clock color="white" size={24} />;
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <Stack.Screen 
        options={{
            title: 'Dashboard',
            headerRight: () => (
                <TouchableOpacity onPress={handleLogout}>
                    <LogOut color="#ac3434" size={24} />
                </TouchableOpacity>
            )
        }} 
      />

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>BP Diagnostic</Text>
          <Text style={styles.welcomeSubtitle}>Welcome back! Here's the summary.</Text>
        </View>

        {/* Period Filter */}
        <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['day', 'week', 'month', 'year'].map((p) => (
                    <TouchableOpacity 
                        key={p} 
                        style={[styles.filterButton, period === p && styles.filterButtonActive]}
                        onPress={() => setPeriod(p)}
                    >
                        <Text style={[styles.filterText, period === p && styles.filterTextActive]}>
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
            {/* Manually mapping stats since structure might differ slightly */}
            <StatCard 
                title="Revenue" 
                value={`₱${data?.stats.totalRevenue}`} 
                color="#10B981" 
                icon={<Banknote color="white" size={24} />} 
            />
            <StatCard 
                title="Patients" 
                value={data?.stats.patientsToday} 
                color="#3B82F6" 
                icon={<Users color="white" size={24} />} 
            />
            <StatCard 
                title="Low Stock" 
                value={data?.stats.lowStockItems} 
                color="#F59E0B" 
                icon={<AlertTriangle color="white" size={24} />} 
            />
            <StatCard 
                title="Pending" 
                value={data?.stats.pendingTests} 
                color="#8B5CF6" 
                icon={<Clock color="white" size={24} />} 
            />
        </View>

        {/* REVENUE CHART */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Revenue Trend</Text>
            {data?.revenueChartData && (
                <LineChart
                    data={{
                        labels: data.revenueChartData.map((d: any) => d.label),
                        datasets: [{ data: data.revenueChartData.map((d: any) => d.value) }]
                    }}
                    width={screenWidth - 48} // Width of card
                    height={220}
                    yAxisLabel="₱"
                    chartConfig={{
                        backgroundColor: "#ffffff",
                        backgroundGradientFrom: "#ffffff",
                        backgroundGradientTo: "#ffffff",
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                        labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            )}
        </View>

        {/* LOW STOCK LIST */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Low Stock Items</Text>
            {data?.lowStockItems.map((item: any, index: number) => {
                const percentage = (item.current_stock / item.minimum_stock) * 100;
                let color = '#10B981'; // green
                if (percentage <= 20) color = '#EF4444'; // red
                else if (percentage <= 40) color = '#F59E0B'; // orange

                return (
                    <View key={index} style={styles.listItem}>
                        <View style={styles.rowBetween}>
                            <Text style={styles.itemName}>{item.name}</Text>
                            <Text style={styles.itemStock}>{item.current_stock} {item.unit}</Text>
                        </View>
                        {/* Progress Bar */}
                        <View style={styles.progressBarBg}>
                            <View style={[
                                styles.progressBarFill, 
                                { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }
                            ]} />
                        </View>
                    </View>
                );
            })}
        </View>

        {/* PENDING TASKS */}
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Pending Tasks</Text>
            {data?.pendingTasks.map((task: any, index: number) => (
                <View key={index} style={styles.taskItem}>
                    <View>
                        <Text style={styles.taskPatient}>{task.patient}</Text>
                        <Text style={styles.taskTest}>{task.test}</Text>
                    </View>
                    <View style={{alignItems: 'flex-end'}}>
                        <Text style={styles.taskTime}>{task.time}</Text>
                        <View style={[styles.badge, 
                            task.status === 'pending' ? {backgroundColor: '#FEF2F2'} : {backgroundColor: '#EFF6FF'}
                        ]}>
                            <Text style={[styles.badgeText,
                                task.status === 'pending' ? {color: '#B91C1C'} : {color: '#1D4ED8'}
                            ]}>{task.status}</Text>
                        </View>
                    </View>
                </View>
            ))}
        </View>

      </ScrollView>
    </View>
  );
}

// Small Component for Stats
const StatCard = ({ title, value, color, icon }: any) => (
    <View style={styles.statCard}>
        <View style={[styles.iconBox, { backgroundColor: color }]}>
            {icon}
        </View>
        <View>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statValue}>{value}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  welcomeSection: { marginBottom: 20 },
  welcomeTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  welcomeSubtitle: { fontSize: 14, color: '#6B7280' },

  filterContainer: { marginBottom: 20, height: 40 },
  filterButton: { 
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, 
    borderWidth: 1, borderColor: '#D1D5DB', marginRight: 8, backgroundColor: 'white' 
  },
  filterButtonActive: { backgroundColor: '#ac3434', borderColor: '#ac3434' },
  filterText: { color: '#374151', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: 'white' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: { 
    width: '48%', backgroundColor: 'white', padding: 16, borderRadius: 12,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  iconBox: { padding: 8, borderRadius: 8 },
  statTitle: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },

  card: { 
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, elevation: 2
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 },

  listItem: { marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 14, fontWeight: '500', color: '#374151' },
  itemStock: { fontSize: 12, color: '#6B7280' },
  progressBarBg: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  taskItem: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', marginBottom: 12 
  },
  taskPatient: { fontWeight: '600', color: '#374151' },
  taskTest: { fontSize: 12, color: '#6B7280' },
  taskTime: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: 'bold', textTransform: 'capitalize' }
});