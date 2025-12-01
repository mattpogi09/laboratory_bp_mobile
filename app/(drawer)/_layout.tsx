import { Drawer } from 'expo-router/drawer';
import { DrawerToggleButton, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import {
  BarChart3,
  ClipboardList,
  Grid,
  Home,
  LogOut,
  Package,
  Percent,
  Settings2,
  UserCog,
  UsersRound,
  Wallet,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

const drawerStyle = {
  backgroundColor: '#ffffff',
};

function CustomDrawerContent(props: any) {
  const { logout, user } = useAuth();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.drawerContainer, { paddingBottom: insets.bottom }]}>
      <DrawerContentScrollView {...props} style={styles.drawerScroll}>
        <View style={styles.userSection}>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut color="#ac3434" size={20} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function DrawerLayout() {
  return (
    <Drawer
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle,
        headerLeft: () => <DrawerToggleButton tintColor="#111827" />,
        headerTitleAlign: 'left',
        drawerActiveTintColor: '#ac3434',
        drawerInactiveTintColor: '#6B7280',
        drawerLabelStyle: { fontSize: 15, fontWeight: '600' },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Dashboard',
          drawerIcon: ({ color }) => <Home color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="patients"
        options={{
          title: 'Patients',
          drawerIcon: ({ color }) => <UsersRound color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          drawerIcon: ({ color }) => <Package color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="lab-queue"
        options={{
          title: 'Lab Queue',
          drawerIcon: ({ color }) => <ClipboardList color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reports"
        options={{
          title: 'Reports & Logs',
          drawerIcon: ({ color }) => <BarChart3 color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="services"
        options={{
          title: 'Service Management',
          drawerIcon: ({ color }) => <Grid color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="users"
        options={{
          title: 'User Management',
          drawerIcon: ({ color }) => <UserCog color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="discounts-philhealth"
        options={{
          title: 'Discounts & PhilHealth',
          drawerIcon: ({ color }) => <Percent color={color} size={20} />,
        }}
      />
      <Drawer.Screen
        name="reconciliation"
        options={{
          title: 'Cash Reconciliation',
          drawerIcon: ({ color }) => <Wallet color={color} size={20} />,
        }}
      />
    </Drawer>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  drawerScroll: {
    flex: 1,
  },
  userSection: {
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
  },
  logoutSection: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ac3434',
  },
});

