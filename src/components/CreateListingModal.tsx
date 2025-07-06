'use client'

import { useState, useEffect } from 'react'
import { X, Package, DollarSign, Hash, AlertCircle, Loader2 } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import ItemIcon from '@/app/components/ItemIcon'

interface CreateListingModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    id: number
    name: string
    quantity: number
    image?: string
    rarity?: number
  }
  onListingCreated?: (listingData: any) => void
}

interface ListingFormData {
  price: string
  quantity: string
  description: string
}

export default function CreateListingModal({
  isOpen,
  onClose,
  item,
  onListingCreated
}: CreateListingModalProps) {
  const [formData, setFormData] = useState<ListingFormData>({
    price: '',
    quantity: '1',
    description: ''
  })
  const [isCreatingListing, setIsCreatingListing] = useState(false)
  const [errors, setErrors] = useState<Partial<ListingFormData>>({})

  const { isConnected, address, sendTransaction } = useWallet()

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        price: '',
        quantity: '1',
        description: ''
      })
      setErrors({})
    }
  }, [isOpen])

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Partial<ListingFormData> = {}

    // Validate price
    const price = parseFloat(formData.price)
    if (!formData.price || isNaN(price) || price <= 0) {
      newErrors.price = 'Please enter a valid price greater than 0'
    }

    // Validate quantity
    const quantity = parseInt(formData.quantity)
    if (!formData.quantity || isNaN(quantity) || quantity <= 0) {
      newErrors.quantity = 'Please enter a valid quantity greater than 0'
    } else if (quantity > item.quantity) {
      newErrors.quantity = `Cannot list more than ${item.quantity} items`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleCreateListing = async () => {
    if (!validateForm() || !isConnected) return

    setIsCreatingListing(true)
    try {
      // Calculate total listing value for display
      const price = parseFloat(formData.price)
      const quantity = parseInt(formData.quantity)
      const totalValue = price * quantity

      // Create listing transaction data
      const listingData = {
        itemId: item.id,
        quantity: quantity,
        pricePerItem: price,
        totalValue: totalValue,
        description: formData.description,
        seller: address,
        timestamp: Date.now()
      }

      // In a real implementation, this would be a smart contract call
      // For demo purposes, we'll simulate the transaction
      const transactionData = {
        to: '0x...', // Marketplace contract address
        data: '0x...', // Encoded function call data
        value: '0', // ETH value (usually 0 for NFT listings)
      }

      // Send transaction through AGW
      const txHash = await sendTransaction(transactionData)
      
      console.log('Listing created successfully:', { listingData, txHash })

      // Notify parent component
      onListingCreated?.({
        ...listingData,
        transactionHash: txHash
      })

      // Close modal
      onClose()

      // You could add a success toast here
    } catch (error) {
      console.error('Failed to create listing:', error)
      // You could add an error toast here
    } finally {
      setIsCreatingListing(false)
    }
  }

  // Handle input changes
  const handleInputChange = (field: keyof ListingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Calculate total value for display
  const totalValue = () => {
    const price = parseFloat(formData.price) || 0
    const quantity = parseInt(formData.quantity) || 0
    return price * quantity
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create Listing</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isCreatingListing}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Item Preview */}
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <ItemIcon 
              itemId={item.id}
              size="medium"
              showRarity={true}
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-600">Available: {item.quantity}</p>
            </div>
          </div>

          {/* Wallet Connection Check */}
          {!isConnected && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-orange-800">Wallet Not Connected</p>
                <p className="text-sm text-orange-700">Please connect your wallet to create listings.</p>
              </div>
            </div>
          )}

          {/* Price Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Price per item (ETH)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              placeholder="0.001"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 
                focus:border-cyan-500 transition-colors
                ${errors.price ? 'border-red-500' : 'border-gray-300'}
              `}
              disabled={isCreatingListing || !isConnected}
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-600">{errors.price}</p>
            )}
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Hash className="w-4 h-4 inline mr-1" />
              Quantity
            </label>
            <input
              type="number"
              min="1"
              max={item.quantity}
              placeholder="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', e.target.value)}
              className={`
                w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 
                focus:border-cyan-500 transition-colors
                ${errors.quantity ? 'border-red-500' : 'border-gray-300'}
              `}
              disabled={isCreatingListing || !isConnected}
            />
            {errors.quantity && (
              <p className="mt-1 text-sm text-red-600">{errors.quantity}</p>
            )}
          </div>

          {/* Description Input (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Package className="w-4 h-4 inline mr-1" />
              Description (Optional)
            </label>
            <textarea
              placeholder="Add a description for your listing..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="
                w-full px-3 py-2 border border-gray-300 rounded-lg 
                focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 
                transition-colors resize-none
              "
              disabled={isCreatingListing || !isConnected}
            />
          </div>

          {/* Total Value Display */}
          {formData.price && formData.quantity && (
            <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-cyan-800">Total Value:</span>
                <span className="text-lg font-bold text-cyan-900">
                  {totalValue().toFixed(4)} ETH
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isCreatingListing}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateListing}
            disabled={!isConnected || isCreatingListing || !formData.price || !formData.quantity}
            className="
              flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg 
              hover:bg-cyan-700 disabled:bg-gray-300 disabled:cursor-not-allowed
              transition-colors flex items-center justify-center space-x-2
            "
          >
            {isCreatingListing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating...</span>
              </>
            ) : (
              <span>Create Listing</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
} 