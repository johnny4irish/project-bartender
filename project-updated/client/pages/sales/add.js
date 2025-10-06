import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'next/router'
import axios from 'axios'
import { API_BASE_URL } from '../../utils/api'
import { toast } from 'react-toastify'
import Button from '../../components/ui/Button'

const AddSale = () => {
  const [formData, setFormData] = useState({
    product: '',
    brand: '',
    quantity: 1,
    proofType: 'receipt'
  })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [mounted, setMounted] = useState(false)
  const [products, setProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [calculatedPoints, setCalculatedPoints] = useState(0)
  const [calculatedPrice, setCalculatedPrice] = useState(0)

  const { product, brand, quantity, proofType } = formData
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    fetchProducts()
  }, [])

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login')
    }
  }, [mounted, isAuthenticated, router])

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/data/products')
      setProducts(response.data)
    } catch (error) {
      console.error('Ошибка при загрузке продуктов:', error)
      toast.error('Ошибка при загрузке продуктов')
    }
  }

  const handleProductChange = (e) => {
    const productId = e.target.value
    const selectedProd = products.find(p => p._id === productId)
    
    if (selectedProd) {
      setSelectedProduct(selectedProd)
      setFormData(prev => ({
        ...prev,
        product: selectedProd.name,
        brand: selectedProd.brand
      }))
      
      // Calculate price and points if quantity is available
      if (quantity) {
        calculatePriceAndPoints(selectedProd, quantity)
      }
    }
  }

  const calculatePriceAndPoints = (product, qty) => {
    if (!product || !product.bottlePrice || !product.portionsPerBottle) return
    
    const portionsSold = parseInt(qty)
    const pricePerPortion = product.bottlePrice / product.portionsPerBottle
    const totalPrice = pricePerPortion * portionsSold
    
    setCalculatedPrice(totalPrice)
    
    let points = 0
    switch (product.pointsCalculationType) {
      case 'per_portion':
        points = portionsSold * product.pointsPerPortion
        break
      case 'per_ruble':
      default:
        points = Math.floor(totalPrice * product.pointsPerRuble)
        break
    }
    
    setCalculatedPoints(points)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Recalculate price and points when quantity changes
    if (name === 'quantity' && selectedProduct) {
      calculatePriceAndPoints(selectedProduct, value)
    }
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      
      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(selectedFile)
      } else {
        setPreview(null)
      }
    }
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    
    if (!selectedProduct) {
      toast.error('Пожалуйста, выберите продукт')
      return
    }
    
    if (!quantity || quantity <= 0) {
      toast.error('Пожалуйста, укажите количество порций')
      return
    }
    
    if (proofType === 'receipt' && !file) {
      toast.error('Пожалуйста, загрузите чек')
      return
    }

    if (proofType === 'photo' && !file) {
      toast.error('Пожалуйста, загрузите фото')
      return
    }

    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('productId', selectedProduct._id)
      formDataToSend.append('product', product)
      formDataToSend.append('brand', brand)
      formDataToSend.append('quantity', quantity)
      formDataToSend.append('proofType', proofType)
      
      if (file) {
        formDataToSend.append('receipt', file)
      }

      const response = await fetch(`${API_BASE_URL}/api/sales`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      })

      if (response.ok) {
        toast.success('Продажа успешно добавлена!')
        setFormData({
          product: '',
          brand: '',
          quantity: 1,
          proofType: 'receipt'
        })
        setSelectedProduct(null)
        setCalculatedPoints(0)
        setCalculatedPrice(0)
        setFile(null)
        setPreview(null)
        router.push('/sales')
      } else {
        const errorData = await response.json()
        toast.error(errorData.message || 'Ошибка при добавлении продажи')
      }
    } catch (error) {
      console.error('Error submitting sale:', error)
      toast.error('Ошибка при отправке данных')
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) return null

  if (!isAuthenticated) {
    return <div>Загрузка...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Добавить продажу</h1>
        
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Product Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Продукт *
            </label>
            <select
              value={selectedProduct?._id || ''}
              onChange={handleProductChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Выберите продукт</option>
              {products.map(product => (
                <option key={product._id} value={product._id}>
                  {product.name} - {product.brand}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Количество *
            </label>
            <input
              type="number"
              name="quantity"
              value={quantity}
              onChange={handleChange}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Price */}
          {/* Price Display */}
          {calculatedPrice > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                Сумма продажи: <strong>{calculatedPrice.toFixed(2)} руб.</strong>
              </p>
            </div>
          )}

          {/* Points Preview */}
          {calculatedPoints > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3">
              <p className="text-sm text-green-800">
                Предварительный расчет: <strong>{calculatedPoints} баллов</strong>
              </p>
            </div>
          )}

          {/* Proof Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип подтверждения *
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="proofType"
                  value="receipt"
                  checked={proofType === 'receipt'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Чек
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="proofType"
                  value="photo"
                  checked={proofType === 'photo'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Фото
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {proofType === 'receipt' ? 'Загрузить чек' : 'Загрузить фото'} *
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept={proofType === 'receipt' ? '.jpg,.jpeg,.png,.pdf' : '.jpg,.jpeg,.png'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="mt-4">
              <img
                src={preview}
                alt="Preview"
                className="max-w-full h-32 object-cover rounded-md border"
              />
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Добавление...' : 'Добавить продажу'}
          </Button>

          {/* Back Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/sales')}
            className="w-full"
          >
            Назад
          </Button>
        </form>
      </div>
    </div>
  )
}

export default AddSale