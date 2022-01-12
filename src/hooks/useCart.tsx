import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // validacao da existencia do produto no carrinho
      const cartList = [...cart];
      const productExists = cartList.find(product => product.id === productId);

      // dados para a validacao do estoque do produto no carrinho e na logistica
      const stock = await api.get(`/stock/${productId}`);

      const stockProductAmount = stock.data.amount;
      const currentCartAmount = productExists ? productExists.amount : 0;
      const desireAmount = currentCartAmount + 1;

      // validacao de produto fora de estoque
      if (desireAmount > stockProductAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      // validacao de agrupamento de produtos iguais
      if (productExists) {
        productExists.amount++;
        setCart(cartList);

        setCart(cartList);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartList));
        return;
      }

      const product = await api.get(`/products/${productId}`);
      const newProduct = {
        ...product.data,
        amount: 1
      }
      cartList.push(newProduct);
      setCart(cartList);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartList));
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      // validacao da existencia do produto no carrinho
      const cartList = [...cart];
      const productExists = cartList.find(product => product.id === productId);
      if (productExists) {
        const cartListWithProduct = cart.filter(product => product.id !== productId);
        setCart(cartListWithProduct);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartListWithProduct));
        return;
      }
      throw Error();
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);
      const stockProductAmount = stock.data.amount;
      if (stockProductAmount < amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }
      
      const cartList = [...cart];
      const productExists = cartList.find(product => product.id === productId);
      if (!productExists) throw Error();

      productExists.amount = amount;
      setCart(cartList);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartList));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
