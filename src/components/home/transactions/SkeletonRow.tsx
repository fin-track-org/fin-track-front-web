export default function SkeletonRow() {
  return (
    <>
      <tr className="animate-pulse">
        <td className="px-6 py-4">
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 w-10 md:w-20 bg-gray-200 rounded" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 w-12 md:w-40 bg-gray-200 rounded" />
        </td>
        <td className="px-6 py-4">
          <div className="h-4 w-14 md:w-20 bg-gray-200 rounded" />
        </td>
        <td className="px-6 py-4 text-right">
          <div className="h-4 w-24 bg-gray-200 rounded ml-auto" />
        </td>
      </tr>
    </>
  );
}
