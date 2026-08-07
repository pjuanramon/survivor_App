import { Tabs } from 'expo-router';
import { Home, Trophy, User, PlusCircle } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarStyle: { backgroundColor: '#0A0A0A', borderTopColor: '#1A1A1A' },
      tabBarActiveTintColor: '#00FF9D',
      tabBarInactiveTintColor: '#888888',
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mis Picks',
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="select"
        options={{
          title: 'Elegir',
          tabBarIcon: ({ color }) => <PlusCircle size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Tabla',
          tabBarIcon: ({ color }) => <Trophy size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
