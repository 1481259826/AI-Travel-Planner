import Link from 'next/link'
import { Plane, MapPin, Wallet, Mic } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Plane className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">AI 旅行规划师</h1>
          </div>
          <div className="flex gap-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              开始使用
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4">
        <section className="py-20 text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            智能规划您的完美旅程
          </h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            使用 AI 技术快速生成个性化旅行计划，支持语音输入，智能预算管理，让旅行规划变得简单高效
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-blue-600 text-white text-lg font-semibold rounded-lg hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
          >
            免费创建行程
          </Link>
        </section>

        {/* Features */}
        <section className="py-16 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Mic className="w-12 h-12 text-blue-600" />}
            title="语音输入"
            description="支持语音快速输入旅行需求，解放双手，更加便捷"
          />
          <FeatureCard
            icon={<Plane className="w-12 h-12 text-purple-600" />}
            title="AI 智能规划"
            description="基于大语言模型生成详细行程，包含景点、餐厅、交通推荐"
          />
          <FeatureCard
            icon={<MapPin className="w-12 h-12 text-green-600" />}
            title="地图可视化"
            description="在地图上直观展示路线和景点位置，一目了然"
          />
          <FeatureCard
            icon={<Wallet className="w-12 h-12 text-orange-600" />}
            title="费用管理"
            description="智能预算估算和实时费用追踪，控制旅行开支"
          />
        </section>

        {/* How it works */}
        <section className="py-16 bg-white rounded-2xl shadow-lg p-12 my-16">
          <h3 className="text-3xl font-bold text-center mb-12">如何使用</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="输入旅行信息"
              description="通过语音或文字输入目的地、日期、预算和偏好"
            />
            <StepCard
              step="2"
              title="AI 生成行程"
              description="智能分析并生成详细的每日行程安排和费用预算"
            />
            <StepCard
              step="3"
              title="管理与分享"
              description="在线管理行程，记录开销，随时与朋友分享计划"
            />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t mt-20 py-8 text-center text-gray-600">
        <p>&copy; 2025 AI Travel Planner. All rights reserved.</p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition">
      <div className="mb-4">{icon}</div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description }: { step: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
        {step}
      </div>
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
